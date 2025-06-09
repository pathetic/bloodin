use std::collections::{HashMap, VecDeque};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use reqwest::Client;
use tokio::fs as async_fs;
use tokio::io::AsyncWriteExt;

#[derive(Debug, Clone)]
struct CacheEntry {
    file_path: PathBuf,
    last_accessed: u64,
    file_size: u64,
}

pub struct AudioCache {
    cache_dir: PathBuf,
    entries: HashMap<String, CacheEntry>,
    access_order: VecDeque<String>, // For LRU tracking
    max_entries: usize,
    client: Client,
}

impl AudioCache {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let cache_dir = std::env::temp_dir().join("bloodin_audio_cache");
        
        // Create cache directory if it doesn't exist
        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir)?;
        }
        
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(120)) // 2 minutes for large files
            .build()?;
        
        let mut cache = Self {
            cache_dir,
            entries: HashMap::new(),
            access_order: VecDeque::new(),
            max_entries: 100,
            client,
        };
        
        // Load existing cache entries
        cache.load_existing_entries()?;
        
        Ok(cache)
    }
    
    fn load_existing_entries(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if !self.cache_dir.exists() {
            return Ok(());
        }
        
        for entry in fs::read_dir(&self.cache_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() {
                if let Some(file_name) = path.file_name() {
                    if let Some(file_name_str) = file_name.to_str() {
                        // Extract song ID from filename (format: {song_id}.audio)
                        if file_name_str.ends_with(".audio") {
                            let song_id = file_name_str.replace(".audio", "");
                            
                            let metadata = fs::metadata(&path)?;
                            let last_accessed = metadata
                                .accessed()
                                .or_else(|_| metadata.modified())
                                .or_else(|_| metadata.created())
                                .unwrap_or(SystemTime::UNIX_EPOCH)
                                .duration_since(UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_secs();
                            
                            let cache_entry = CacheEntry {
                                file_path: path.clone(),
                                last_accessed,
                                file_size: metadata.len(),
                            };
                            
                            self.entries.insert(song_id.clone(), cache_entry);
                            self.access_order.push_back(song_id);
                        }
                    }
                }
            }
        }
        
        // Sort access order by last accessed time
        self.access_order.make_contiguous().sort_by(|a, b| {
            let a_time = self.entries.get(a).map(|e| e.last_accessed).unwrap_or(0);
            let b_time = self.entries.get(b).map(|e| e.last_accessed).unwrap_or(0);
            a_time.cmp(&b_time)
        });
        
        println!("📦 Loaded {} cached audio files", self.entries.len());
        Ok(())
    }
    
    pub fn get_cached_path(&mut self, song_id: &str) -> Option<PathBuf> {
        // Check if entry exists and file exists
        if let Some(entry) = self.entries.get(song_id) {
            if entry.file_path.exists() {
                let file_path = entry.file_path.clone();
                // Update access time and move to end of LRU queue
                self.update_access_time(song_id);
                println!("🎵 Cache hit for song: {}", song_id);
                return Some(file_path);
            }
        }
        
        // File was deleted externally or doesn't exist, remove from cache
        if self.entries.contains_key(song_id) {
            self.remove_entry(song_id);
        }
        
        None
    }
    
    pub async fn cache_audio(&mut self, song_id: &str, stream_url: &str) -> Result<PathBuf, Box<dyn std::error::Error>> {
        // Check if already cached
        if let Some(cached_path) = self.get_cached_path(song_id) {
            return Ok(cached_path);
        }
        
        println!("⬇️ Downloading and caching audio for song: {}", song_id);
        
        // Ensure we don't exceed max entries
        self.ensure_cache_size();
        
        // Download the audio file
        let response = self.client.get(stream_url).send().await?;
        
        if !response.status().is_success() {
            return Err(format!("Failed to download audio: {}", response.status()).into());
        }
        
        let file_path = self.cache_dir.join(format!("{}.audio", song_id));
        let mut file = async_fs::File::create(&file_path).await?;
        
        // Stream the content to file
        let bytes = response.bytes().await?;
        file.write_all(&bytes).await?;
        file.flush().await?;
        
        // Get file size
        let metadata = async_fs::metadata(&file_path).await?;
        let file_size = metadata.len();
        
        // Add to cache
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        let cache_entry = CacheEntry {
            file_path: file_path.clone(),
            last_accessed: now,
            file_size,
        };
        
        self.entries.insert(song_id.to_string(), cache_entry);
        self.access_order.push_back(song_id.to_string());
        
        println!("💾 Cached audio file: {} ({} bytes)", song_id, file_size);
        
        Ok(file_path)
    }
    
    fn update_access_time(&mut self, song_id: &str) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        if let Some(entry) = self.entries.get_mut(song_id) {
            entry.last_accessed = now;
        }
        
        // Move to end of LRU queue
        if let Some(pos) = self.access_order.iter().position(|x| x == song_id) {
            self.access_order.remove(pos);
        }
        self.access_order.push_back(song_id.to_string());
    }
    
    fn ensure_cache_size(&mut self) {
        while self.entries.len() >= self.max_entries {
            if let Some(oldest_id) = self.access_order.pop_front() {
                self.remove_entry(&oldest_id);
                println!("🗑️ Evicted old cached file: {}", oldest_id);
            } else {
                break;
            }
        }
    }
    
    fn remove_entry(&mut self, song_id: &str) {
        if let Some(entry) = self.entries.remove(song_id) {
            // Try to delete the file
            if let Err(e) = fs::remove_file(&entry.file_path) {
                println!("⚠️ Failed to delete cache file {}: {}", entry.file_path.display(), e);
            }
        }
        
        // Remove from access order
        if let Some(pos) = self.access_order.iter().position(|x| x == song_id) {
            self.access_order.remove(pos);
        }
    }
    
    pub fn get_cache_stats(&self) -> (usize, u64) {
        let total_size: u64 = self.entries.values().map(|e| e.file_size).sum();
        (self.entries.len(), total_size)
    }
    
    pub fn clear_cache(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        for (song_id, _) in self.entries.clone() {
            self.remove_entry(&song_id);
        }
        println!("🧹 Cleared audio cache");
        Ok(())
    }
} 
use reqwest::Client;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JellyfinConfig {
    pub server_url: String,
    pub username: String,
    pub user_id: String,
    pub access_token: String,
    pub device_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerInfo {
    pub server_name: String,
    pub version: String,
    pub product_name: String,
    pub operating_system: String,
    pub id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserProfile {
    pub name: String,
    pub id: String,
    pub has_password: bool,
    pub has_configured_password: bool,
    pub enable_auto_login: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MusicItem {
    #[serde(rename = "Id")]
    pub id: String,
    #[serde(rename = "Name")]
    pub name: String,
    #[serde(rename = "Type")]
    pub item_type: String,
    #[serde(rename = "UserData", default)]
    pub user_data: Option<UserData>,
    #[serde(rename = "RunTimeTicks")]
    pub runtime_ticks: Option<i64>,
    #[serde(rename = "ProductionYear")]
    pub production_year: Option<i32>,
    #[serde(rename = "IndexNumber")]
    pub track_number: Option<i32>,
    #[serde(rename = "ParentIndexNumber")]
    pub disc_number: Option<i32>,
    #[serde(rename = "Album")]
    pub album: Option<String>,
    #[serde(rename = "AlbumArtist")]
    pub album_artist: Option<String>,
    #[serde(rename = "Artists")]
    pub artists: Option<Vec<String>>,
    #[serde(rename = "AlbumId")]
    pub album_id: Option<String>,
    #[serde(rename = "ArtistItems")]
    pub artist_items: Option<Vec<NameIdPair>>,
    #[serde(rename = "ImageTags")]
    pub image_tags: Option<std::collections::HashMap<String, String>>,
    #[serde(rename = "BackdropImageTags")]
    pub backdrop_image_tags: Option<Vec<String>>,
    #[serde(rename = "ChildCount")]
    pub child_count: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserData {
    #[serde(rename = "IsFavorite")]
    pub is_favorite: bool,
    #[serde(rename = "PlayCount")]
    pub play_count: Option<i32>,
    #[serde(rename = "PlaybackPositionTicks")]
    pub playback_position_ticks: Option<i64>,
    #[serde(rename = "LastPlayedDate")]
    pub last_played_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NameIdPair {
    #[serde(rename = "Name")]
    pub name: String,
    #[serde(rename = "Id")]
    pub id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ItemsResponse {
    #[serde(rename = "Items")]
    pub items: Vec<MusicItem>,
    #[serde(rename = "TotalRecordCount")]
    pub total_record_count: i32,
    #[serde(rename = "StartIndex")]
    pub start_index: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    #[serde(rename = "AccessToken")]
    pub access_token: String,
    #[serde(rename = "User")]
    pub user: UserInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserInfo {
    #[serde(rename = "Name")]
    pub name: String,
    #[serde(rename = "Id")]
    pub id: String,
    #[serde(rename = "HasPassword")]
    pub has_password: bool,
    #[serde(rename = "HasConfiguredPassword")]
    pub has_configured_password: bool,
    #[serde(rename = "EnableAutoLogin")]
    pub enable_auto_login: bool,
}

#[derive(Debug, Serialize)]
struct AuthRequest {
    #[serde(rename = "Username")]
    username: String,
    #[serde(rename = "Pw")]
    password: String,
}

#[derive(Debug, Clone)]
struct CachedResponse {
    response: ItemsResponse,
    timestamp: u64,
}

impl CachedResponse {
    fn new(response: ItemsResponse) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        Self { response, timestamp }
    }

    fn is_expired(&self, ttl_seconds: u64) -> bool {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        now - self.timestamp > ttl_seconds
    }
}

pub struct JellyfinClient {
    client: Client,
    config: Option<JellyfinConfig>,
    cache: HashMap<String, CachedResponse>,
}

impl JellyfinClient {
    pub fn new() -> Self {
        // Create a more robust HTTP client with proper configuration
        let client = Client::builder()
            .user_agent("Bloodin/0.1.0")
            .timeout(std::time::Duration::from_secs(30))
            .danger_accept_invalid_certs(true) // Accept self-signed certificates
            .danger_accept_invalid_hostnames(true) // Accept hostname mismatches
            .redirect(reqwest::redirect::Policy::limited(10))
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            client,
            config: None,
            cache: HashMap::new(),
        }
    }

    pub fn set_config(&mut self, config: JellyfinConfig) {
        self.config = Some(config);
    }

    pub fn get_config(&self) -> Option<&JellyfinConfig> {
        self.config.as_ref()
    }

    pub async fn get_server_info(&self, server_url: &str) -> Result<ServerInfo, Box<dyn std::error::Error>> {
        let url = format!("{}/System/Info/Public", server_url.trim_end_matches('/'));
        println!("Attempting to connect to: {}", url);
        
        let response = match self.client
            .get(&url)
            .header("Accept", "application/json")
            .send()
            .await {
                Ok(response) => response,
                Err(e) => {
                    println!("Request failed: {}", e);
                    return Err(format!("Connection failed to {}: {}", url, e).into());
                }
            };

        println!("Response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("Server returned error {}: {}", status, error_text).into());
        }

        let server_info: serde_json::Value = match response.json().await {
            Ok(json) => json,
            Err(e) => {
                return Err(format!("Failed to parse server response: {}", e).into());
            }
        };
        
        println!("Server info received: {:?}", server_info);
        
        Ok(ServerInfo {
            server_name: server_info["ServerName"].as_str().unwrap_or("Unknown").to_string(),
            version: server_info["Version"].as_str().unwrap_or("Unknown").to_string(),
            product_name: server_info["ProductName"].as_str().unwrap_or("Jellyfin").to_string(),
            operating_system: server_info["OperatingSystem"].as_str().unwrap_or("Unknown").to_string(),
            id: server_info["Id"].as_str().unwrap_or("").to_string(),
        })
    }

    pub async fn authenticate(&mut self, server_url: &str, username: &str, password: &str) -> Result<JellyfinConfig, Box<dyn std::error::Error>> {
        let device_id = Uuid::new_v4().to_string();
        let url = format!("{}/Users/AuthenticateByName", server_url.trim_end_matches('/'));
        println!("Attempting authentication to: {}", url);
        
        let auth_request = AuthRequest {
            username: username.to_string(),
            password: password.to_string(),
        };

        let response = match self.client
            .post(&url)
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .header("Authorization", format!(
                "MediaBrowser Client=\"Jelly Player\", Device=\"Desktop\", DeviceId=\"{}\", Version=\"0.1.0\"", 
                device_id
            ))
            .json(&auth_request)
            .send()
            .await {
                Ok(response) => response,
                Err(e) => {
                    println!("Authentication request failed: {}", e);
                    return Err(format!("Authentication connection failed to {}: {}", url, e).into());
                }
            };

        println!("Authentication response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            println!("Authentication failed with status {}: {}", status, error_text);
            return Err(format!("Authentication failed: {} - {}", status, error_text).into());
        }

        let auth_response: AuthResponse = match response.json().await {
            Ok(response) => response,
            Err(e) => {
                return Err(format!("Failed to parse authentication response: {}", e).into());
            }
        };
        
        let config = JellyfinConfig {
            server_url: server_url.to_string(),
            username: username.to_string(),
            user_id: auth_response.user.id,
            access_token: auth_response.access_token,
            device_id,
        };

        self.config = Some(config.clone());
        Ok(config)
    }

    pub async fn get_user_profile(&self) -> Result<UserProfile, Box<dyn std::error::Error>> {
        let config = self.config.as_ref().ok_or("Not authenticated")?;
        let url = format!("{}/Users/{}", config.server_url.trim_end_matches('/'), config.user_id);
        
        let response = self.client
            .get(&url)
            .header("Accept", "application/json")
            .header("Authorization", format!(
                "MediaBrowser Client=\"Jelly Player\", Device=\"Desktop\", DeviceId=\"{}\", Version=\"0.1.0\", Token=\"{}\"", 
                config.device_id, config.access_token
            ))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to get user profile: {}", response.status()).into());
        }

        let user_info: UserInfo = response.json().await?;
        
        Ok(UserProfile {
            name: user_info.name,
            id: user_info.id,
            has_password: user_info.has_password,
            has_configured_password: user_info.has_configured_password,
            enable_auto_login: user_info.enable_auto_login,
        })
    }

    pub async fn validate_token(&self) -> Result<bool, Box<dyn std::error::Error>> {
        match self.get_user_profile().await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    // Get authorization header for authenticated requests
    fn get_auth_header(&self) -> Result<String, Box<dyn std::error::Error>> {
        let config = self.config.as_ref().ok_or("Not authenticated")?;
        Ok(format!(
            "MediaBrowser Client=\"Jelly Player\", Device=\"Desktop\", DeviceId=\"{}\", Version=\"0.1.0\", Token=\"{}\"",
            config.device_id, config.access_token
        ))
    }

    // Get music library items with filters
    pub async fn get_items(&mut self, item_type: &str, limit: Option<i32>, start_index: Option<i32>) -> Result<ItemsResponse, Box<dyn std::error::Error>> {
        self.get_items_with_sort(item_type, limit, start_index, "SortName", "Ascending").await
    }

    // Get music library items with custom sorting (with caching)
    pub async fn get_items_with_sort(&mut self, item_type: &str, limit: Option<i32>, start_index: Option<i32>, sort_by: &str, sort_order: &str) -> Result<ItemsResponse, Box<dyn std::error::Error>> {
        println!("📊 get_items_with_sort called with item_type: {}, limit: {:?}, start_index: {:?}, sort: {} {}", item_type, limit, start_index, sort_by, sort_order);
        
        // Create cache key from request parameters
        let cache_key = format!("{}:{}:{}:{}:{}", 
            item_type, 
            limit.unwrap_or(0), 
            start_index.unwrap_or(0), 
            sort_by, 
            sort_order
        );
        
        // Check cache first (10 minutes TTL)
        if let Some(cached) = self.cache.get(&cache_key) {
            if !cached.is_expired(600) { // 10 minutes = 600 seconds
                println!("📦 Cache hit for key: {}", cache_key);
                return Ok(cached.response.clone());
            } else {
                println!("🕒 Cache expired for key: {}", cache_key);
                self.cache.remove(&cache_key);
            }
        }
        
        println!("🌐 Cache miss, fetching from server for key: {}", cache_key);
        
        let config = self.config.as_ref().ok_or("Not authenticated")?;
        
        let mut url = format!(
            "{}/Users/{}/Items?IncludeItemTypes={}&Recursive=true&Fields=BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear&SortBy={}&SortOrder={}",
            config.server_url.trim_end_matches('/'),
            config.user_id,
            item_type,
            sort_by,
            sort_order
        );

        if let Some(limit) = limit {
            url.push_str(&format!("&Limit={}", limit));
        }
        if let Some(start_index) = start_index {
            url.push_str(&format!("&StartIndex={}", start_index));
        }

        println!("Fetching items: {}", url);

        let auth_header = self.get_auth_header()?;
        let response = match self.client
            .get(&url)
            .header("Accept", "application/json")
            .header("Authorization", auth_header)
            .send()
            .await {
                Ok(response) => response,
                Err(e) => {
                    println!("Request failed: {}", e);
                    return Err(format!("Failed to fetch items: {}", e).into());
                }
            };

        println!("Response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("Server returned error {}: {}", status, error_text).into());
        }

        let items_response: ItemsResponse = match response.json().await {
            Ok(response) => response,
            Err(e) => {
                return Err(format!("Failed to parse items response: {}", e).into());
            }
        };

        println!("Fetched {} items of type {}", items_response.items.len(), item_type);
        
        // Store in cache
        self.cache.insert(cache_key.clone(), CachedResponse::new(items_response.clone()));
        println!("💾 Cached response for key: {}", cache_key);
        
        Ok(items_response)
    }

    // Get random songs
    pub async fn get_random_songs(&mut self, limit: Option<i32>) -> Result<ItemsResponse, Box<dyn std::error::Error>> {
        println!("🎲 get_random_songs called with limit: {:?}", limit);
        self.get_items_with_sort("Audio", limit, None, "Random", "Ascending").await
    }

    // Get recently added albums
    pub async fn get_recent_albums(&mut self, limit: Option<i32>, start_index: Option<i32>) -> Result<ItemsResponse, Box<dyn std::error::Error>> {
        println!("📅 get_recent_albums called with limit: {:?}, start_index: {:?}", limit, start_index);
        self.get_items_with_sort("MusicAlbum", limit, start_index, "DateCreated", "Descending").await
    }

    // Get songs (bypassing cache for testing pagination)
    pub async fn get_songs(&mut self, limit: Option<i32>, start_index: Option<i32>) -> Result<ItemsResponse, Box<dyn std::error::Error>> {
        println!("🎵 get_songs called with limit: {:?}, start_index: {:?}", limit, start_index);
        
        let config = self.config.as_ref().ok_or("Not authenticated")?;
        
        let mut url = format!(
            "{}/Users/{}/Items?IncludeItemTypes=Audio&Recursive=true&Fields=BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear&SortBy=SortName&SortOrder=Ascending",
            config.server_url.trim_end_matches('/'),
            config.user_id
        );

        if let Some(limit) = limit {
            url.push_str(&format!("&Limit={}", limit));
        }
        if let Some(start_index) = start_index {
            url.push_str(&format!("&StartIndex={}", start_index));
        }

        println!("🔗 Fetching songs URL: {}", url);

        let auth_header = self.get_auth_header()?;
        let response = match self.client
            .get(&url)
            .header("Accept", "application/json")
            .header("Authorization", auth_header)
            .send()
            .await {
                Ok(response) => response,
                Err(e) => {
                    println!("Request failed: {}", e);
                    return Err(format!("Failed to fetch songs: {}", e).into());
                }
            };

        println!("Response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("Server returned error {}: {}", status, error_text).into());
        }

        let items_response: ItemsResponse = match response.json().await {
            Ok(response) => response,
            Err(e) => {
                return Err(format!("Failed to parse songs response: {}", e).into());
            }
        };

        println!("🎯 Fetched {} songs (StartIndex: {}, Total: {})", 
            items_response.items.len(), 
            items_response.start_index, 
            items_response.total_record_count
        );
        
        Ok(items_response)
    }

    // Get albums
    pub async fn get_albums(&mut self, limit: Option<i32>, start_index: Option<i32>) -> Result<ItemsResponse, Box<dyn std::error::Error>> {
        self.get_items("MusicAlbum", limit, start_index).await
    }

    // Get artists
    pub async fn get_artists(&mut self, limit: Option<i32>, start_index: Option<i32>) -> Result<ItemsResponse, Box<dyn std::error::Error>> {
        self.get_items("MusicArtist", limit, start_index).await
    }

    // Get playlists
    pub async fn get_playlists(&mut self, limit: Option<i32>, start_index: Option<i32>) -> Result<ItemsResponse, Box<dyn std::error::Error>> {
        self.get_items("Playlist", limit, start_index).await
    }

    // Search across all music items
    pub async fn search(&self, query: &str, limit: Option<i32>) -> Result<ItemsResponse, Box<dyn std::error::Error>> {
        let config = self.config.as_ref().ok_or("Not authenticated")?;
        
        let mut url = format!(
            "{}/Users/{}/Items?SearchTerm={}&IncludeItemTypes=Audio,MusicAlbum,MusicArtist,Playlist&Recursive=true&Fields=BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear&SortBy=SortName&SortOrder=Ascending",
            config.server_url.trim_end_matches('/'),
            config.user_id,
            urlencoding::encode(query)
        );

        if let Some(limit) = limit {
            url.push_str(&format!("&Limit={}", limit));
        }

        println!("Searching: {}", url);

        let auth_header = self.get_auth_header()?;
        let response = match self.client
            .get(&url)
            .header("Accept", "application/json")
            .header("Authorization", auth_header)
            .send()
            .await {
                Ok(response) => response,
                Err(e) => {
                    println!("Search request failed: {}", e);
                    return Err(format!("Search failed: {}", e).into());
                }
            };

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("Search returned error {}: {}", status, error_text).into());
        }

        let items_response: ItemsResponse = match response.json().await {
            Ok(response) => response,
            Err(e) => {
                return Err(format!("Failed to parse search response: {}", e).into());
            }
        };

        println!("Search found {} items for query: {}", items_response.items.len(), query);
        Ok(items_response)
    }

    // Get a single item by ID
    pub async fn get_item_details(&self, item_id: &str) -> Result<MusicItem, Box<dyn std::error::Error>> {
        let config = self.config.as_ref().ok_or("Not authenticated")?;
        
        let url = format!(
            "{}/Users/{}/Items/{}?Fields=BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear",
            config.server_url.trim_end_matches('/'),
            config.user_id,
            item_id
        );

        println!("Fetching item details: {}", url);

        let auth_header = self.get_auth_header()?;
        let response = match self.client
            .get(&url)
            .header("Accept", "application/json")
            .header("Authorization", auth_header)
            .send()
            .await {
                Ok(response) => response,
                Err(e) => {
                    println!("Request failed: {}", e);
                    return Err(format!("Failed to fetch item details: {}", e).into());
                }
            };

        println!("Response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("Server returned error {}: {}", status, error_text).into());
        }

        let item: MusicItem = match response.json().await {
            Ok(item) => item,
            Err(e) => {
                return Err(format!("Failed to parse item response: {}", e).into());
            }
        };

        println!("Fetched item details for: {}", item.name);
        Ok(item)
    }

    // Get image URL for an item
    pub fn get_image_url(&self, item_id: &str, image_type: &str) -> Result<String, Box<dyn std::error::Error>> {
        let config = self.config.as_ref().ok_or("Not authenticated")?;
        
        // Try multiple URL formats that Jellyfin might use
        let urls = vec![
            // Standard API format with api_key parameter
            format!(
                "{}/Items/{}/Images/{}?api_key={}",
                config.server_url.trim_end_matches('/'),
                item_id,
                image_type,
                config.access_token
            ),
            // Alternative format with X-Emby-Token (Jellyfin sometimes uses this)
            format!(
                "{}/Items/{}/Images/{}?X-Emby-Token={}",
                config.server_url.trim_end_matches('/'),
                item_id,
                image_type,
                config.access_token
            ),
            // Format with maxHeight/maxWidth (common in Jellyfin)
            format!(
                "{}/Items/{}/Images/{}?maxHeight=400&maxWidth=400&quality=90&api_key={}",
                config.server_url.trim_end_matches('/'),
                item_id,
                image_type,
                config.access_token
            ),
        ];
        
        let url = &urls[0]; // Use the first one for now
        Ok(url.clone())
    }

    // Get stream URL for audio
    pub fn get_stream_url(&self, item_id: &str) -> Result<String, Box<dyn std::error::Error>> {
        let config = self.config.as_ref().ok_or("Not authenticated")?;
        Ok(format!(
            "{}/Audio/{}/stream?static=true&api_key={}",
            config.server_url.trim_end_matches('/'),
            item_id,
            config.access_token
        ))
    }
} 
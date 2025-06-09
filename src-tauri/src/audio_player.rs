use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::time::{Duration, Instant};
use tokio::sync::{broadcast, mpsc, oneshot};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackState {
    pub is_playing: bool,
    pub current_position: f64, // in seconds
    pub duration: f64,         // in seconds
    pub volume: f32,           // 0.0 to 1.0
    pub is_shuffled: bool,
    pub repeat_mode: RepeatMode,
    pub current_song: Option<QueueItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RepeatMode {
    None,
    One,
    All,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueItem {
    pub id: String,
    pub name: String,
    pub artists: Vec<String>,
    pub album: Option<String>,
    pub duration_ticks: Option<i64>,
    pub stream_url: String,
}

#[derive(Debug, Clone)]
pub enum PlayerEvent {
    StateChanged(PlaybackState),
    TrackChanged(Option<QueueItem>),
    PositionUpdate(f64),
    Error(String),
}

#[derive(Debug)]
pub enum PlayerCommand {
    PlayItem { item: QueueItem, response: oneshot::Sender<Result<(), String>> },
    Pause,
    Resume,
    Stop,
    SetVolume(f32),
    Seek(f64),
    ToggleShuffle,
    SetRepeatMode(RepeatMode),
    GetState { response: oneshot::Sender<PlaybackState> },
    NextTrack,
    PreviousTrack,
    Shutdown,
}

#[derive(Clone)]
pub struct AudioPlayer {
    command_sender: mpsc::UnboundedSender<PlayerCommand>,
    event_sender: broadcast::Sender<PlayerEvent>, // Keep for new subscriptions
}

struct AudioPlayerWorker {
    _stream: OutputStream,
    stream_handle: OutputStreamHandle,
    sink: Option<Sink>,
    state: PlaybackState,
    queue: VecDeque<QueueItem>,
    current_index: Option<usize>,
    command_receiver: mpsc::UnboundedReceiver<PlayerCommand>,
    event_sender: broadcast::Sender<PlayerEvent>,
    last_position_update: Instant,
    // Track actual audio playback time vs visual position
    audio_start_time: Option<Instant>,
    visual_position: f64,
    // Cache audio data to avoid re-downloading on seek
    cached_audio_data: Option<Vec<u8>>,
    cached_song_id: Option<String>,
}

impl AudioPlayer {
    pub fn new() -> Result<Self, String> {
        let (event_sender, _) = broadcast::channel(100);
        let (command_sender, command_receiver) = mpsc::unbounded_channel();
        
        let event_sender_clone = event_sender.clone();
        
        // Spawn worker task on a thread that doesn't require Send
        std::thread::spawn(move || {
            let rt = tokio::runtime::Runtime::new().expect("Failed to create runtime");
            rt.block_on(async {
                // Create the audio output stream inside the worker thread
                match OutputStream::try_default() {
                    Ok((_stream, stream_handle)) => {
                        let worker = AudioPlayerWorker {
                            _stream,
                            stream_handle,
                            sink: None,
                            state: PlaybackState {
                                is_playing: false,
                                current_position: 0.0,
                                duration: 0.0,
                                volume: 0.7,
                                is_shuffled: false,
                                repeat_mode: RepeatMode::None,
                                current_song: None,
                            },
                            queue: VecDeque::new(),
                            current_index: None,
                            command_receiver,
                            event_sender: event_sender_clone.clone(),
                            last_position_update: Instant::now(),
                            audio_start_time: None,
                            visual_position: 0.0,
                            cached_audio_data: None,
                            cached_song_id: None,
                        };
                        worker.run().await;
                    }
                    Err(e) => {
                        eprintln!("Failed to create audio output stream: {}", e);
                        let _ = event_sender_clone.send(PlayerEvent::Error(format!("Failed to create audio output stream: {}", e)));
                    }
                }
            });
        });

        Ok(AudioPlayer {
            command_sender,
            event_sender,
        })
    }

    pub fn subscribe_to_events(&self) -> broadcast::Receiver<PlayerEvent> {
        self.event_sender.subscribe()
    }

    pub async fn play_item(&self, item: QueueItem) -> Result<(), String> {
        let (response_tx, response_rx) = oneshot::channel();
        self.command_sender
            .send(PlayerCommand::PlayItem { item, response: response_tx })
            .map_err(|_| "Failed to send play command")?;
        
        response_rx.await.map_err(|_| "Failed to receive response".to_string())?
    }

    pub fn pause(&self) -> Result<(), String> {
        self.command_sender
            .send(PlayerCommand::Pause)
            .map_err(|_| "Failed to send pause command".to_string())
    }

    pub fn resume(&self) -> Result<(), String> {
        self.command_sender
            .send(PlayerCommand::Resume)
            .map_err(|_| "Failed to send resume command".to_string())
    }

    pub fn stop(&self) -> Result<(), String> {
        self.command_sender
            .send(PlayerCommand::Stop)
            .map_err(|_| "Failed to send stop command".to_string())
    }

    pub fn set_volume(&self, volume: f32) -> Result<(), String> {
        self.command_sender
            .send(PlayerCommand::SetVolume(volume))
            .map_err(|_| "Failed to send volume command".to_string())
    }

    pub fn seek(&self, position: f64) -> Result<(), String> {
        self.command_sender
            .send(PlayerCommand::Seek(position))
            .map_err(|_| "Failed to send seek command".to_string())
    }

    pub fn toggle_shuffle(&self) -> Result<(), String> {
        self.command_sender
            .send(PlayerCommand::ToggleShuffle)
            .map_err(|_| "Failed to send shuffle command".to_string())
    }

    pub fn set_repeat_mode(&self, mode: RepeatMode) -> Result<(), String> {
        self.command_sender
            .send(PlayerCommand::SetRepeatMode(mode))
            .map_err(|_| "Failed to send repeat mode command".to_string())
    }

    pub async fn get_state(&self) -> Result<PlaybackState, String> {
        let (response_tx, response_rx) = oneshot::channel();
        self.command_sender
            .send(PlayerCommand::GetState { response: response_tx })
            .map_err(|_| "Failed to send get state command".to_string())?;
        
        response_rx.await.map_err(|_| "Failed to receive state response".to_string())
    }

    pub fn next_track(&self) -> Result<(), String> {
        self.command_sender
            .send(PlayerCommand::NextTrack)
            .map_err(|_| "Failed to send next track command".to_string())
    }

    pub fn previous_track(&self) -> Result<(), String> {
        self.command_sender
            .send(PlayerCommand::PreviousTrack)
            .map_err(|_| "Failed to send previous track command".to_string())
    }
}

impl AudioPlayerWorker {
    async fn run(mut self) {
        // Create a position tracking task
        let mut position_interval = tokio::time::interval(Duration::from_millis(250)); // Update 4 times per second
        
        loop {
            tokio::select! {
                // Handle commands
                command = self.command_receiver.recv() => {
                    match command {
                        Some(PlayerCommand::PlayItem { item, response }) => {
                            let result = self.play_item(item).await;
                            let _ = response.send(result);
                        }
                        Some(PlayerCommand::Pause) => {
                            self.pause();
                        }
                        Some(PlayerCommand::Resume) => {
                            self.resume();
                        }
                        Some(PlayerCommand::Stop) => {
                            self.stop();
                        }
                        Some(PlayerCommand::SetVolume(volume)) => {
                            self.set_volume(volume);
                        }
                        Some(PlayerCommand::Seek(position)) => {
                            self.seek(position).await;
                        }
                        Some(PlayerCommand::ToggleShuffle) => {
                            self.toggle_shuffle();
                        }
                        Some(PlayerCommand::SetRepeatMode(mode)) => {
                            self.set_repeat_mode(mode);
                        }
                        Some(PlayerCommand::GetState { response }) => {
                            self.update_position(); // Update position before sending state
                            let _ = response.send(self.state.clone());
                        }
                        Some(PlayerCommand::NextTrack) => {
                            self.next_track().await;
                        }
                        Some(PlayerCommand::PreviousTrack) => {
                            self.previous_track().await;
                        }
                        Some(PlayerCommand::Shutdown) => {
                            break;
                        }
                        None => break, // Channel closed
                    }
                }
                
                // Position tracking timer
                _ = position_interval.tick() => {
                    if self.state.is_playing {
                        self.update_position();
                    }
                }
            }
        }
    }

    async fn play_item(&mut self, item: QueueItem) -> Result<(), String> {
        // Clear cache if playing a different song
        if self.cached_song_id.as_ref() != Some(&item.id) {
            self.cached_audio_data = None;
            self.cached_song_id = None;
        }
        
        self.play_item_with_offset(item, 0.0).await
    }

    async fn play_item_with_offset(&mut self, item: QueueItem, offset_seconds: f64) -> Result<(), String> {
        println!("🎵 Playing item: {} - {} (offset: {}s)", item.name, item.stream_url, offset_seconds);

        // Always use cached data or download/load full file (HTTP range doesn't work for audio formats)
        let audio_data = if self.cached_song_id.as_ref() == Some(&item.id) && self.cached_audio_data.is_some() {
            println!("🎵 Using cached audio data for instant seeking");
            self.cached_audio_data.as_ref().unwrap().clone()
        } else {
            if item.stream_url.starts_with("file://") {
                // Handle local file URLs
                println!("🎵 Loading local cached audio file");
                let file_path = item.stream_url.strip_prefix("file://").unwrap();
                let data = tokio::fs::read(file_path).await
                    .map_err(|e| format!("Failed to read cached audio file: {}", e))?;
                
                // Cache the data for future seeks
                self.cached_audio_data = Some(data.clone());
                self.cached_song_id = Some(item.id.clone());
                
                data
            } else {
                // Handle HTTP/HTTPS URLs
                println!("🎵 Downloading and caching audio data from stream");
                let response = reqwest::get(&item.stream_url).await
                    .map_err(|e| format!("Failed to download audio: {}", e))?;
                let bytes = response.bytes().await
                    .map_err(|e| format!("Failed to read audio bytes: {}", e))?;
                let data = bytes.to_vec();
                
                // Cache the data for future seeks
                self.cached_audio_data = Some(data.clone());
                self.cached_song_id = Some(item.id.clone());
                
                data
            }
        };

        // Create decoder
        let cursor = std::io::Cursor::new(audio_data);
        let mut decoder = Decoder::new(cursor)
            .map_err(|e| format!("Failed to create decoder: {}", e))?;
        
        // Get duration if available
        let duration = item.duration_ticks
            .map(|ticks| ticks as f64 / 10_000_000.0) // Convert ticks to seconds
            .unwrap_or(0.0);

        // For seeking: skip samples efficiently using iterator methods
        if offset_seconds > 0.0 {
            println!("🎵 Seeking to {}s using optimized sample skipping", offset_seconds);
            
            // Estimate samples to skip based on common audio parameters
            let estimated_sample_rate = 44100.0;
            let estimated_channels = 2.0;
            let samples_to_skip = (offset_seconds * estimated_sample_rate * estimated_channels) as usize;
            
            println!("🎵 Skipping {} samples for {}s offset", samples_to_skip, offset_seconds);
            
            // Use iterator methods for better performance
            let mut skipped = 0;
            while skipped < samples_to_skip {
                if decoder.next().is_none() {
                    println!("🎵 Reached end of audio during seek at sample {}", skipped);
                    break;
                }
                skipped += 1;
                
                // Progress feedback for long seeks
                if skipped % 1000000 == 0 {
                    let progress = (skipped as f64 / samples_to_skip as f64) * 100.0;
                    println!("🎵 Seeking progress: {:.1}%", progress);
                }
            }
            
            println!("🎵 Seek complete, skipped {} samples", skipped);
        }

        // Create new sink
        let sink = Sink::try_new(&self.stream_handle)
            .map_err(|e| format!("Failed to create sink: {}", e))?;
        
        // Set volume
        sink.set_volume(self.state.volume);

        // Add the (possibly seeked) decoder to sink
        sink.append(decoder);

        // Update state
        self.state.is_playing = !sink.is_paused();
        self.state.current_position = offset_seconds;
        self.state.duration = duration;
        self.state.current_song = Some(item.clone());
        
        // Set tracking variables
        self.audio_start_time = Some(Instant::now());
        self.visual_position = offset_seconds;

        // Store the sink
        self.sink = Some(sink);

        // Emit events
        let _ = self.event_sender.send(PlayerEvent::TrackChanged(Some(item)));
        let _ = self.event_sender.send(PlayerEvent::StateChanged(self.state.clone()));

        Ok(())
    }

    fn pause(&mut self) {
        if let Some(sink) = &self.sink {
            sink.pause();
            self.update_position(); // Update position before pausing
            self.state.is_playing = false;
            self.audio_start_time = None; // Stop tracking
            let _ = self.event_sender.send(PlayerEvent::StateChanged(self.state.clone()));
        }
    }

    fn resume(&mut self) {
        if let Some(sink) = &self.sink {
            sink.play();
            self.state.is_playing = true;
            // Restart tracking from current visual position
            self.audio_start_time = Some(Instant::now());
            self.visual_position = self.state.current_position;
            let _ = self.event_sender.send(PlayerEvent::StateChanged(self.state.clone()));
        }
    }

    fn stop(&mut self) {
        if let Some(sink) = &self.sink {
            sink.stop();
        }
        self.sink = None;
        self.state.is_playing = false;
        self.state.current_position = 0.0;
        self.state.current_song = None;
        self.audio_start_time = None;
        self.visual_position = 0.0;
        
        // Clear audio cache when stopping
        self.cached_audio_data = None;
        self.cached_song_id = None;
        
        let _ = self.event_sender.send(PlayerEvent::StateChanged(self.state.clone()));
        let _ = self.event_sender.send(PlayerEvent::TrackChanged(None));
    }

    fn set_volume(&mut self, volume: f32) {
        let clamped_volume = volume.clamp(0.0, 1.0);
        
        if let Some(sink) = &self.sink {
            sink.set_volume(clamped_volume);
        }
        
        self.state.volume = clamped_volume;
        let _ = self.event_sender.send(PlayerEvent::StateChanged(self.state.clone()));
    }

    async fn seek(&mut self, position: f64) {
        // Implement real seeking by restarting playback from the desired position
        if let Some(current_song) = self.state.current_song.clone() {
            let was_playing = self.state.is_playing;
            
            // Stop current playback
            if let Some(sink) = &self.sink {
                sink.stop();
            }
            self.sink = None;
            
            println!("🎵 Real seek to position: {} seconds", position);
            
            // Restart playback from the new position using cached data
            if let Err(e) = self.play_item_with_offset(current_song, position).await {
                println!("Failed to seek: {}", e);
                return;
            }
            
            // If it was paused before seeking, pause it again
            if !was_playing {
                if let Some(sink) = &self.sink {
                    sink.pause();
                    self.state.is_playing = false;
                    self.audio_start_time = None;
                }
            }
            
            let _ = self.event_sender.send(PlayerEvent::StateChanged(self.state.clone()));
        }
    }

    fn update_position(&mut self) {
        if let Some(start_time) = self.audio_start_time {
            if self.state.is_playing {
                let elapsed = start_time.elapsed().as_secs_f64();
                let new_position = self.visual_position + elapsed;
                
                // Check if track has finished
                if self.state.duration > 0.0 && new_position >= self.state.duration {
                    self.state.current_position = self.state.duration;
                    self.state.is_playing = false;
                    self.audio_start_time = None;
                    
                    // TODO: Auto-advance to next track based on repeat mode
                    println!("Track finished - would auto-advance here");
                    
                    let _ = self.event_sender.send(PlayerEvent::StateChanged(self.state.clone()));
                } else {
                    self.state.current_position = new_position;
                    
                    // Send position update event (but limit frequency)
                    let now = Instant::now();
                    if now.duration_since(self.last_position_update).as_millis() >= 500 {
                        let _ = self.event_sender.send(PlayerEvent::PositionUpdate(self.state.current_position));
                        let _ = self.event_sender.send(PlayerEvent::StateChanged(self.state.clone()));
                        self.last_position_update = now;
                    }
                }
            }
        }
    }

    fn toggle_shuffle(&mut self) {
        self.state.is_shuffled = !self.state.is_shuffled;
        let _ = self.event_sender.send(PlayerEvent::StateChanged(self.state.clone()));
    }

    fn set_repeat_mode(&mut self, mode: RepeatMode) {
        self.state.repeat_mode = mode;
        let _ = self.event_sender.send(PlayerEvent::StateChanged(self.state.clone()));
    }

    async fn next_track(&mut self) {
        if self.queue.is_empty() {
            return;
        }

        let next_index = match self.current_index {
            Some(index) => {
                if index + 1 >= self.queue.len() {
                    // At end of queue
                    match self.state.repeat_mode {
                        RepeatMode::All => Some(0), // Loop back to start
                        _ => None,                  // No more tracks
                    }
                } else {
                    Some(index + 1)
                }
            }
            None => Some(0), // Start from beginning
        };

        if let Some(index) = next_index {
            if let Some(item) = self.queue.get(index).cloned() {
                self.current_index = Some(index);
                let _ = self.play_item(item).await;
            }
        }
    }

    async fn previous_track(&mut self) {
        if self.queue.is_empty() {
            return;
        }

        let prev_index = match self.current_index {
            Some(index) => {
                if index == 0 {
                    // At beginning of queue
                    match self.state.repeat_mode {
                        RepeatMode::All => Some(self.queue.len() - 1), // Loop to end
                        _ => None,                                     // No previous tracks
                    }
                } else {
                    Some(index - 1)
                }
            }
            None => Some(self.queue.len() - 1), // Start from end
        };

        if let Some(index) = prev_index {
            if let Some(item) = self.queue.get(index).cloned() {
                self.current_index = Some(index);
                let _ = self.play_item(item).await;
            }
        }
    }
} 
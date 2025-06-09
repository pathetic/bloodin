use rodio::{OutputStream, OutputStreamHandle, Sink, Source};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::time::{Duration, Instant};
use tokio::sync::{broadcast, mpsc, oneshot};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::probe::Hint;
use symphonia::core::formats::FormatOptions;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::audio::SampleBuffer;
use symphonia::core::units::{Time, TimeBase};
use symphonia::core::formats::{SeekMode, SeekTo};
use std::io::Cursor;

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
    symphonia_source: Option<SymphoniaSource>, // Store for seeking
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

// Custom symphonia-based audio source for instant seeking
struct SymphoniaSource {
    format_reader: Box<dyn symphonia::core::formats::FormatReader>,
    decoder: Box<dyn symphonia::core::codecs::Decoder>,
    track_id: u32,
    sample_buffer: Option<SampleBuffer<f32>>,
    sample_queue: std::collections::VecDeque<f32>,
    sample_rate: u32,
    channels: u16,
    total_duration: Option<Duration>,
}

impl SymphoniaSource {
    fn from_data(audio_data: Vec<u8>) -> Result<Self, String> {
        // Create media source from audio data
        let cursor = Cursor::new(audio_data);
        let media_source = Box::new(cursor);
        let media_source_stream = MediaSourceStream::new(media_source, Default::default());
        
        // Create probe and format options
        let mut hint = Hint::new();
        let format_opts = FormatOptions::default();
        let metadata_opts = MetadataOptions::default();
        
        // Probe for format
        let probe = symphonia::default::get_probe();
        let probe_result = probe
            .format(&mut hint, media_source_stream, &format_opts, &metadata_opts)
            .map_err(|e| format!("Failed to probe format: {}", e))?;
        
        let format_reader = probe_result.format;
        
        // Get the default track
        let track = format_reader
            .tracks()
            .iter()
            .find(|t| t.codec_params.codec != symphonia::core::codecs::CODEC_TYPE_NULL)
            .ok_or("No valid audio track found")?
            .clone();
        
        let track_id = track.id;
        
        // Create decoder
        let decoder_opts = Default::default();
        let decoder = symphonia::default::get_codecs()
            .make(&track.codec_params, &decoder_opts)
            .map_err(|e| format!("Failed to create decoder: {}", e))?;
        
        // Get audio parameters
        let sample_rate = track.codec_params.sample_rate.unwrap_or(44100);
        let channels = track.codec_params.channels.map(|c| c.count() as u16).unwrap_or(2);
        
        // Calculate total duration if available
        let total_duration = track.codec_params.n_frames
            .map(|frames| Duration::from_secs_f64(frames as f64 / sample_rate as f64));
        
        Ok(Self {
            format_reader,
            decoder,
            track_id,
            sample_buffer: None,
            sample_queue: std::collections::VecDeque::new(),
            sample_rate,
            channels,
            total_duration,
        })
    }
    
    // INSTANT SEEK! 🚀
    fn seek_to_time(&mut self, time_seconds: f64) -> Result<(), String> {
        if time_seconds <= 0.0 {
            return Ok(());
        }
        
        println!("🚀 INSTANT SEEK to {}s using native symphonia seeking!", time_seconds);
        
        // Convert to symphonia time units
        let time_base = TimeBase::new(1, self.sample_rate);
        let timestamp = time_base.calc_timestamp(Time::from(time_seconds));
        
        // Perform native seek - THIS IS INSTANT! 🚀
        self.format_reader
            .seek(SeekMode::Accurate, SeekTo::TimeStamp { ts: timestamp, track_id: self.track_id })
            .map_err(|e| format!("Seek failed: {}", e))?;
        
        // Clear any buffered samples
        self.sample_queue.clear();
        
        println!("🚀 INSTANT SEEK COMPLETE! No sample iteration needed!");
        Ok(())
    }
    
    fn fill_sample_buffer(&mut self) -> Result<(), String> {
        if !self.sample_queue.is_empty() {
            return Ok(());
        }
        
        // Read next packet
        match self.format_reader.next_packet() {
            Ok(packet) => {
                if packet.track_id() == self.track_id {
                    match self.decoder.decode(&packet) {
                        Ok(audio_buf) => {
                            // Initialize sample buffer if needed
                            if self.sample_buffer.is_none() {
                                let spec = *audio_buf.spec();
                                self.sample_buffer = Some(SampleBuffer::<f32>::new(
                                    audio_buf.capacity() as u64,
                                    spec,
                                ));
                            }
                            
                            // Copy samples to buffer
                            if let Some(ref mut buf) = self.sample_buffer {
                                buf.copy_interleaved_ref(audio_buf);
                                self.sample_queue.extend(buf.samples().iter().cloned());
                            }
                        }
                        Err(_) => return Err("Decode error".to_string()),
                    }
                }
            }
            Err(_) => return Err("End of stream".to_string()),
        }
        
        Ok(())
    }
}

// Implement rodio's Source trait for compatibility
impl Iterator for SymphoniaSource {
    type Item = f32;
    
    fn next(&mut self) -> Option<Self::Item> {
        // Try to fill buffer if empty
        if self.fill_sample_buffer().is_ok() {
            self.sample_queue.pop_front()
        } else {
            None
        }
    }
}

impl Source for SymphoniaSource {
    fn current_frame_len(&self) -> Option<usize> {
        None
    }
    
    fn channels(&self) -> u16 {
        self.channels
    }
    
    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
    
    fn total_duration(&self) -> Option<Duration> {
        self.total_duration
    }
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
                            symphonia_source: None,
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

        // Create SymphoniaSource for INSTANT seeking! 🚀
        println!("🚀 Creating SymphoniaSource for instant seeking capabilities");
        let mut symphonia_source = SymphoniaSource::from_data(audio_data)?;
        
        // Perform instant seek if needed
        if offset_seconds > 0.0 {
            symphonia_source.seek_to_time(offset_seconds)?;
        }

        // Get duration if available
        let duration = item.duration_ticks
            .map(|ticks| ticks as f64 / 10_000_000.0) // Convert ticks to seconds
            .unwrap_or_else(|| {
                // Try to get duration from symphonia source
                symphonia_source.total_duration()
                    .map(|d| d.as_secs_f64())
                    .unwrap_or(0.0)
            });

        // Create new sink
        let sink = Sink::try_new(&self.stream_handle)
            .map_err(|e| format!("Failed to create sink: {}", e))?;
        
        // Set volume
        sink.set_volume(self.state.volume);

        // Add the symphonia source to sink
        sink.append(symphonia_source);

        // Store the symphonia source for future seeking
        // Note: We need to create a new one since the old one is consumed by sink
        let mut seeking_source = SymphoniaSource::from_data(
            self.cached_audio_data.as_ref().unwrap().clone()
        )?;
        if offset_seconds > 0.0 {
            // Keep the seeking source in sync
            let _ = seeking_source.seek_to_time(offset_seconds);
        }
        self.symphonia_source = Some(seeking_source);

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

        println!("🚀 INSTANT SEEK playback started at {}s using SymphoniaSource!", offset_seconds);

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

    async fn seek(&mut self, position: f64) {
        println!("🚀 INSTANT SEEK to position: {} seconds", position);
        
        if let Some(current_song) = self.state.current_song.clone() {
            let was_playing = self.state.is_playing;
            
            // INSTANT SEEK: Create new SymphoniaSource at seek position! 🚀
            if let Some(cached_data) = &self.cached_audio_data {
                match SymphoniaSource::from_data(cached_data.clone()) {
                    Ok(mut new_source) => {
                        // Seek the new source to the desired position
                        match new_source.seek_to_time(position) {
                            Ok(_) => {
                                println!("🚀 INSTANT SEEK: Creating new playback source at {}s", position);
                                
                                // Stop current playback
                                if let Some(sink) = &self.sink {
                                    sink.stop();
                                }
                                
                                // Create new sink with the sought source
                                match Sink::try_new(&self.stream_handle) {
                                    Ok(new_sink) => {
                                        new_sink.set_volume(self.state.volume);
                                        new_sink.append(new_source);
                                        
                                        // Update stored source for future seeks
                                        if let Ok(mut seeking_source) = SymphoniaSource::from_data(cached_data.clone()) {
                                            let _ = seeking_source.seek_to_time(position);
                                            self.symphonia_source = Some(seeking_source);
                                        }
                                        
                                        // If was paused, pause the new sink
                                        if !was_playing {
                                            new_sink.pause();
                                        }
                                        
                                        // Update state
                                        self.sink = Some(new_sink);
                                        self.state.current_position = position;
                                        self.visual_position = position;
                                        self.state.is_playing = was_playing;
                                        self.audio_start_time = if was_playing { Some(Instant::now()) } else { None };
                                        
                                        println!("🚀 INSTANT SEEK completed! Now playing from {}s", position);
                                        let _ = self.event_sender.send(PlayerEvent::StateChanged(self.state.clone()));
                                        return;
                                    }
                                    Err(e) => {
                                        println!("⚠️ Failed to create new sink: {}", e);
                                    }
                                }
                            }
                            Err(e) => {
                                println!("⚠️ Symphonia seek failed: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        println!("⚠️ Failed to create new SymphoniaSource: {}", e);
                    }
                }
            }
            
            // Fallback: restart playback method (slower but reliable)
            println!("🎵 Falling back to restart-based seeking");
            
            // Stop current playback
            if let Some(sink) = &self.sink {
                sink.stop();
            }
            self.sink = None;
            
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
} 
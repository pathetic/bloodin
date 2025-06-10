use crate::audio_player::{AudioPlayer, PlaybackState, QueueItem, RepeatMode};
use crate::jellyfin::{JellyfinClient, ServerInfo, UserProfile, MusicItem};
use crate::storage;
use crate::audio_cache::AudioCache;
use std::os::windows::process::CommandExt;
use std::sync::{Arc, Mutex};
use tokio::sync::Mutex as TokioMutex;
use tauri::State;

pub struct AppState {
    pub jellyfin_client: Arc<Mutex<JellyfinClient>>,
    pub audio_player: Arc<Mutex<AudioPlayer>>,
    pub audio_cache: Arc<TokioMutex<AudioCache>>,
}

impl AppState {
    pub fn new() -> Self {
        let audio_player = AudioPlayer::new().expect("Failed to initialize audio player");
        let audio_cache = AudioCache::new().expect("Failed to initialize audio cache");
        Self {
            jellyfin_client: Arc::new(Mutex::new(JellyfinClient::new())),
            audio_player: Arc::new(Mutex::new(audio_player)),
            audio_cache: Arc::new(TokioMutex::new(audio_cache)),
        }
    }
}

#[derive(serde::Serialize)]
pub struct ConnectResult {
    pub success: bool,
    pub message: String,
    pub user_name: Option<String>,
    pub server_name: Option<String>,
}

#[derive(serde::Serialize)]
pub struct ServerInfoResult {
    pub success: bool,
    pub message: String,
    pub server_info: Option<ServerInfo>,
}

#[derive(serde::Serialize)]
pub struct UserProfileResult {
    pub success: bool,
    pub message: String,
    pub user_profile: Option<UserProfile>,
}

#[derive(serde::Serialize)]
pub struct AuthCheckResult {
    pub is_authenticated: bool,
    pub user_name: Option<String>,
    pub server_name: Option<String>,
    pub server_url: Option<String>,
}

#[derive(serde::Serialize)]
pub struct MusicLibraryResult {
    pub success: bool,
    pub message: String,
    pub items: Option<Vec<MusicItem>>,
    pub total_count: Option<i32>,
}

#[derive(serde::Serialize)]
pub struct ItemResult {
    pub success: bool,
    pub message: String,
    pub item: Option<MusicItem>,
}

#[tauri::command]
pub async fn connect_to_jellyfin(
    server_url: String,
    username: String,
    password: String,
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<ConnectResult, String> {
    // Create a new client for this operation
    let mut client = JellyfinClient::new();
    
    // First, get server info to validate the URL
    let server_info = match client.get_server_info(&server_url).await {
        Ok(info) => info,
        Err(e) => {
            return Ok(ConnectResult {
                success: false,
                message: format!("Failed to connect to server: {}", e),
                user_name: None,
                server_name: None,
            });
        }
    };

    // Attempt authentication
    let config = match client.authenticate(&server_url, &username, &password).await {
        Ok(config) => config,
        Err(e) => {
            return Ok(ConnectResult {
                success: false,
                message: format!("Authentication failed: {}", e),
                user_name: None,
                server_name: Some(server_info.server_name),
            });
        }
    };

    // Update the shared state
    {
        let mut shared_client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        shared_client.set_config(config.clone());
    }

    // Save credentials securely
    if let Err(e) = storage::save_jellyfin_config(&app_handle, &config).await {
        eprintln!("Failed to save credentials: {}", e);
    }

    Ok(ConnectResult {
        success: true,
        message: "Successfully connected to Jellyfin".to_string(),
        user_name: Some(config.username),
        server_name: Some(server_info.server_name),
    })
}

#[tauri::command]
pub async fn get_server_info(
    server_url: String,
    _state: State<'_, AppState>,
) -> Result<ServerInfoResult, String> {
    // Create a new client for this operation
    let client = JellyfinClient::new();
    
    match client.get_server_info(&server_url).await {
        Ok(server_info) => Ok(ServerInfoResult {
            success: true,
            message: "Server info retrieved successfully".to_string(),
            server_info: Some(server_info),
        }),
        Err(e) => Ok(ServerInfoResult {
            success: false,
            message: format!("Failed to get server info: {}", e),
            server_info: None,
        }),
    }
}

#[tauri::command]
pub async fn get_user_profile(
    state: State<'_, AppState>,
) -> Result<UserProfileResult, String> {
    // Get the client config from shared state
    let client_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match client_config {
        Some(config) => config,
        None => {
            return Ok(UserProfileResult {
                success: false,
                message: "Not authenticated".to_string(),
                user_profile: None,
            });
        }
    };

    // Create a new client and set the config
    let mut client = JellyfinClient::new();
    client.set_config(config);
    
    match client.get_user_profile().await {
        Ok(user_profile) => Ok(UserProfileResult {
            success: true,
            message: "User profile retrieved successfully".to_string(),
            user_profile: Some(user_profile),
        }),
        Err(e) => Ok(UserProfileResult {
            success: false,
            message: format!("Failed to get user profile: {}", e),
            user_profile: None,
        }),
    }
}

#[tauri::command]
pub async fn check_authentication(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<AuthCheckResult, String> {
    // Try to load saved credentials
    let saved_config = match storage::load_jellyfin_config(&app_handle).await {
        Ok(config) => config,
        Err(e) => {
            eprintln!("Failed to load saved config: {}", e);
            return Ok(AuthCheckResult {
                is_authenticated: false,
                user_name: None,
                server_name: None,
                server_url: None,
            });
        }
    };

    let config = match saved_config {
        Some(config) => config,
        None => {
            return Ok(AuthCheckResult {
                is_authenticated: false,
                user_name: None,
                server_name: None,
                server_url: None,
            });
        }
    };

    // Create a new client and validate the token
    let mut client = JellyfinClient::new();
    client.set_config(config.clone());

    let is_valid = match client.validate_token().await {
        Ok(valid) => valid,
        Err(_) => false,
    };

    let server_info = if is_valid {
        client.get_server_info(&config.server_url).await.ok()
    } else {
        None
    };

    if is_valid {
        // Update the shared state with valid config
        {
            let mut shared_client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
            shared_client.set_config(config.clone());
        }
        
        Ok(AuthCheckResult {
            is_authenticated: true,
            user_name: Some(config.username),
            server_name: server_info.map(|info| info.server_name),
            server_url: Some(config.server_url),
        })
    } else {
        // Clear invalid credentials
        if let Err(e) = storage::clear_jellyfin_config(&app_handle).await {
            eprintln!("Failed to clear invalid credentials: {}", e);
        }
        
        Ok(AuthCheckResult {
            is_authenticated: false,
            user_name: None,
            server_name: None,
            server_url: None,
        })
    }
}

#[tauri::command]
pub async fn logout(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<bool, String> {
    // Clear saved credentials
    if let Err(e) = storage::clear_jellyfin_config(&app_handle).await {
        eprintln!("Failed to clear credentials: {}", e);
        return Ok(false);
    }

    // Clear client config
    let mut client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
    *client = JellyfinClient::new();

    Ok(true)
}

#[tauri::command]
pub async fn get_songs(
    limit: Option<i32>,
    start_index: Option<i32>,
    state: State<'_, AppState>,
) -> Result<MusicLibraryResult, String> {
    println!("🔧 get_songs called with limit: {:?}, start_index: {:?}", limit, start_index);
    let client_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match client_config {
        Some(config) => config,
        None => {
            return Ok(MusicLibraryResult {
                success: false,
                message: "Not authenticated".to_string(),
                items: None,
                total_count: None,
            });
        }
    };

    let mut client = JellyfinClient::new();
    client.set_config(config);

    match client.get_songs(limit, start_index).await {
        Ok(response) => Ok(MusicLibraryResult {
            success: true,
            message: "Songs retrieved successfully".to_string(),
            items: Some(response.items),
            total_count: Some(response.total_record_count),
        }),
        Err(e) => Ok(MusicLibraryResult {
            success: false,
            message: format!("Failed to get songs: {}", e),
            items: None,
            total_count: None,
        }),
    }
}

#[tauri::command]
pub async fn get_albums(
    limit: Option<i32>,
    start_index: Option<i32>,
    state: State<'_, AppState>,
) -> Result<MusicLibraryResult, String> {
    let client_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match client_config {
        Some(config) => config,
        None => {
            return Ok(MusicLibraryResult {
                success: false,
                message: "Not authenticated".to_string(),
                items: None,
                total_count: None,
            });
        }
    };

    let mut client = JellyfinClient::new();
    client.set_config(config);

    match client.get_albums(limit, start_index).await {
        Ok(response) => Ok(MusicLibraryResult {
            success: true,
            message: "Albums retrieved successfully".to_string(),
            items: Some(response.items),
            total_count: Some(response.total_record_count),
        }),
        Err(e) => Ok(MusicLibraryResult {
            success: false,
            message: format!("Failed to get albums: {}", e),
            items: None,
            total_count: None,
        }),
    }
}

#[tauri::command]
pub async fn get_artists(
    limit: Option<i32>,
    start_index: Option<i32>,
    state: State<'_, AppState>,
) -> Result<MusicLibraryResult, String> {
    let client_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match client_config {
        Some(config) => config,
        None => {
            return Ok(MusicLibraryResult {
                success: false,
                message: "Not authenticated".to_string(),
                items: None,
                total_count: None,
            });
        }
    };

    let mut client = JellyfinClient::new();
    client.set_config(config);

    match client.get_artists(limit, start_index).await {
        Ok(response) => Ok(MusicLibraryResult {
            success: true,
            message: "Artists retrieved successfully".to_string(),
            items: Some(response.items),
            total_count: Some(response.total_record_count),
        }),
        Err(e) => Ok(MusicLibraryResult {
            success: false,
            message: format!("Failed to get artists: {}", e),
            items: None,
            total_count: None,
        }),
    }
}

#[tauri::command]
pub async fn get_playlists(
    limit: Option<i32>,
    start_index: Option<i32>,
    state: State<'_, AppState>,
) -> Result<MusicLibraryResult, String> {
    let client_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match client_config {
        Some(config) => config,
        None => {
            return Ok(MusicLibraryResult {
                success: false,
                message: "Not authenticated".to_string(),
                items: None,
                total_count: None,
            });
        }
    };

    let mut client = JellyfinClient::new();
    client.set_config(config);

    match client.get_playlists(limit, start_index).await {
        Ok(response) => Ok(MusicLibraryResult {
            success: true,
            message: "Playlists retrieved successfully".to_string(),
            items: Some(response.items),
            total_count: Some(response.total_record_count),
        }),
        Err(e) => Ok(MusicLibraryResult {
            success: false,
            message: format!("Failed to get playlists: {}", e),
            items: None,
            total_count: None,
        }),
    }
}

#[tauri::command]
pub async fn search_music(
    query: String,
    limit: Option<i32>,
    state: State<'_, AppState>,
) -> Result<MusicLibraryResult, String> {
    let client_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match client_config {
        Some(config) => config,
        None => {
            return Ok(MusicLibraryResult {
                success: false,
                message: "Not authenticated".to_string(),
                items: None,
                total_count: None,
            });
        }
    };

    let mut client = JellyfinClient::new();
    client.set_config(config);

    match client.search(&query, limit).await {
        Ok(response) => Ok(MusicLibraryResult {
            success: true,
            message: "Search completed successfully".to_string(),
            items: Some(response.items),
            total_count: Some(response.total_record_count),
        }),
        Err(e) => Ok(MusicLibraryResult {
            success: false,
            message: format!("Search failed: {}", e),
            items: None,
            total_count: None,
        }),
    }
}

#[tauri::command]
pub async fn get_image_url(
    itemId: String,
    imageType: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let client_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match client_config {
        Some(config) => config,
        None => {
            return Err("Not authenticated".to_string());
        }
    };

    let mut client = JellyfinClient::new();
    client.set_config(config);

    match client.get_image_url(&itemId, &imageType) {
        Ok(url) => Ok(url),
        Err(e) => Err(format!("Failed to get image URL: {}", e)),
    }
}

#[tauri::command]
pub async fn get_stream_url(
    itemId: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let client_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match client_config {
        Some(config) => config,
        None => {
            return Err("Not authenticated".to_string());
        }
    };

    let mut client = JellyfinClient::new();
    client.set_config(config);

    match client.get_stream_url(&itemId) {
        Ok(url) => Ok(url),
        Err(e) => Err(format!("Failed to get stream URL: {}", e)),
    }
}

// Audio Player Commands

#[tauri::command]
pub async fn play_song(
    item_id: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    // Get Jellyfin client config
    let jellyfin_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match jellyfin_config {
        Some(config) => config,
        None => {
            return Err("Not authenticated with Jellyfin".to_string());
        }
    };

    // Create temporary client to get song details and stream URL
    let mut jellyfin_client = JellyfinClient::new();
    jellyfin_client.set_config(config);

    // Get stream URL
    let stream_url = match jellyfin_client.get_stream_url(&item_id) {
        Ok(url) => url,
        Err(e) => {
            return Err(format!("Failed to get stream URL: {}", e));
        }
    };

    // Try to get cached audio file or cache it
    let cached_url = {
        // First, check if already cached
        let cached_path = {
            let mut cache = state.audio_cache.lock().await;
            cache.get_cached_path(&item_id)
        };
        
        if let Some(cached_path) = cached_path {
            format!("file://{}", cached_path.to_string_lossy())
        } else {
            // Cache the audio file
            let cache_result = {
                let mut cache = state.audio_cache.lock().await;
                cache.cache_audio(&item_id, &stream_url).await
            };
            
            match cache_result {
                Ok(cached_path) => {
                    println!("✅ Successfully cached audio for song: {}", item_id);
                    format!("file://{}", cached_path.to_string_lossy())
                },
                Err(e) => {
                    println!("⚠️ Failed to cache audio for song {}: {}", item_id, e);
                    // Fall back to direct streaming
                    stream_url.clone()
                }
            }
        }
    };

    // Get song details from Jellyfin
    let song_details = match jellyfin_client.get_item_details(&item_id).await {
        Ok(item) => item,
        Err(e) => {
            return Err(format!("Failed to get song details: {}", e));
        }
    };

    // Extract artist names
    let artists = if let Some(ref artists_vec) = song_details.artists {
        if !artists_vec.is_empty() {
            artists_vec.clone()
        } else if let Some(ref album_artist) = song_details.album_artist {
            vec![album_artist.clone()]
        } else {
            vec!["Unknown Artist".to_string()]
        }
    } else if let Some(ref album_artist) = song_details.album_artist {
        vec![album_artist.clone()]
    } else {
        vec!["Unknown Artist".to_string()]
    };

    // Extract artist IDs
    let artist_ids = if let Some(ref artist_items) = song_details.artist_items {
        Some(artist_items.iter().map(|item| item.id.clone()).collect())
    } else {
        None
    };

    // Create queue item with real song data (use cached URL if available)
    let queue_item = QueueItem {
        id: item_id.clone(),
        name: song_details.name.clone(),
        artists: artists.clone(),
        artist_ids: artist_ids.clone(),
        album: song_details.album.clone(),
        duration_ticks: song_details.runtime_ticks,
        stream_url: cached_url.clone(),
    };

    // Play the song - clone the AudioPlayer to avoid holding the lock
    let audio_player = {
        let ap = state.audio_player.lock().map_err(|e| e.to_string())?;
        ap.clone()  // AudioPlayer is designed to be cloneable for this purpose
    };
    
    // Try to play with cached URL first, fallback to original stream URL if it fails
    match audio_player.play_item(queue_item).await {
        Ok(_) => {
            println!("✅ Successfully played song using cached/stream URL");
            Ok(true)
        },
        Err(e) => {
            // If cached file failed and we were using a cached URL, try original stream URL
            if cached_url != stream_url {
                println!("⚠️ Cached file failed ({}), trying original stream URL", e);
                
                let fallback_queue_item = QueueItem {
                    id: item_id.clone(),
                    name: song_details.name.clone(),
                    artists: artists.clone(),
                    artist_ids: artist_ids.clone(),
                    album: song_details.album.clone(),
                    duration_ticks: song_details.runtime_ticks,
                    stream_url: stream_url,
                };
                
                match audio_player.play_item(fallback_queue_item).await {
                    Ok(_) => {
                        println!("✅ Successfully played song using fallback stream URL");
                        Ok(true)
                    },
                    Err(fallback_e) => {
                        Err(format!("Failed to play song with both cached file and stream URL. Cached error: {}. Stream error: {}", e, fallback_e))
                    }
                }
            } else {
                Err(format!("Failed to play song: {}", e))
            }
        }
    }
}

#[tauri::command]
pub fn pause_playback(state: State<'_, AppState>) -> Result<bool, String> {
    let audio_player = state.audio_player.lock().map_err(|e| e.to_string())?;
    audio_player.pause()?;
    Ok(true)
}

#[tauri::command]
pub fn resume_playback(state: State<'_, AppState>) -> Result<bool, String> {
    let audio_player = state.audio_player.lock().map_err(|e| e.to_string())?;
    audio_player.resume()?;
    Ok(true)
}

#[tauri::command]
pub fn stop_playback(state: State<'_, AppState>) -> Result<bool, String> {
    let audio_player = state.audio_player.lock().map_err(|e| e.to_string())?;
    audio_player.stop()?;
    Ok(true)
}

#[tauri::command]
pub fn set_volume(state: State<'_, AppState>, volume: f32) -> Result<bool, String> {
    let audio_player = state.audio_player.lock().map_err(|e| e.to_string())?;
    audio_player.set_volume(volume)?;
    Ok(true)
}

#[tauri::command]
pub fn seek_to(state: State<'_, AppState>, position: f64) -> Result<bool, String> {
    let audio_player = state.audio_player.lock().map_err(|e| e.to_string())?;
    audio_player.seek(position)?;
    Ok(true)
}

#[tauri::command]
pub fn toggle_shuffle(state: State<'_, AppState>) -> Result<bool, String> {
    let audio_player = state.audio_player.lock().map_err(|e| e.to_string())?;
    audio_player.toggle_shuffle()?;
    Ok(true)
}

#[tauri::command]
pub fn set_repeat_mode(state: State<'_, AppState>, mode: String) -> Result<bool, String> {
    let repeat_mode = match mode.as_str() {
        "none" => RepeatMode::None,
        "one" => RepeatMode::One,
        "all" => RepeatMode::All,
        _ => return Err("Invalid repeat mode".to_string()),
    };

    let audio_player = state.audio_player.lock().map_err(|e| e.to_string())?;
    audio_player.set_repeat_mode(repeat_mode)?;
    Ok(true)
}

#[tauri::command]
pub async fn get_playback_state(state: State<'_, AppState>) -> Result<PlaybackState, String> {
    let audio_player = {
        let ap = state.audio_player.lock().map_err(|e| e.to_string())?;
        ap.clone()
    };
    audio_player.get_state().await
}

#[tauri::command]
pub fn next_track(state: State<'_, AppState>) -> Result<bool, String> {
    let audio_player = state.audio_player.lock().map_err(|e| e.to_string())?;
    audio_player.next_track()?;
    Ok(true)
}

#[tauri::command]
pub fn previous_track(state: State<'_, AppState>) -> Result<bool, String> {
    let audio_player = state.audio_player.lock().map_err(|e| e.to_string())?;
    audio_player.previous_track()?;
    Ok(true)
}

#[tauri::command]
pub async fn get_random_songs(
    limit: Option<i32>,
    state: State<'_, AppState>,
) -> Result<MusicLibraryResult, String> {
    println!("🎲 get_random_songs command called with limit: {:?}", limit);
    let client_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match client_config {
        Some(config) => config,
        None => {
            return Ok(MusicLibraryResult {
                success: false,
                message: "Not authenticated".to_string(),
                items: None,
                total_count: None,
            });
        }
    };

    let mut client = JellyfinClient::new();
    client.set_config(config);

    match client.get_random_songs(limit).await {
        Ok(response) => Ok(MusicLibraryResult {
            success: true,
            message: "Random songs retrieved successfully".to_string(),
            items: Some(response.items),
            total_count: Some(response.total_record_count),
        }),
        Err(e) => Ok(MusicLibraryResult {
            success: false,
            message: format!("Failed to get random songs: {}", e),
            items: None,
            total_count: None,
        }),
    }
}

#[tauri::command]
pub async fn get_recent_albums(
    limit: Option<i32>,
    start_index: Option<i32>,
    state: State<'_, AppState>,
) -> Result<MusicLibraryResult, String> {
    println!("📅 get_recent_albums command called with limit: {:?}, start_index: {:?}", limit, start_index);
    let client_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match client_config {
        Some(config) => config,
        None => {
            return Ok(MusicLibraryResult {
                success: false,
                message: "Not authenticated".to_string(),
                items: None,
                total_count: None,
            });
        }
    };

    let mut client = JellyfinClient::new();
    client.set_config(config);

    match client.get_recent_albums(limit, start_index).await {
        Ok(response) => Ok(MusicLibraryResult {
            success: true,
            message: "Recent albums retrieved successfully".to_string(),
            items: Some(response.items),
            total_count: Some(response.total_record_count),
        }),
        Err(e) => Ok(MusicLibraryResult {
            success: false,
            message: format!("Failed to get recent albums: {}", e),
            items: None,
            total_count: None,
        }),
    }
}

#[tauri::command]
pub async fn get_album_songs(
    album_id: String,
    state: State<'_, AppState>,
) -> Result<MusicLibraryResult, String> {
    let client_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match client_config {
        Some(config) => config,
        None => {
            return Ok(MusicLibraryResult {
                success: false,
                message: "Not authenticated".to_string(),
                items: None,
                total_count: None,
            });
        }
    };

    let mut client = JellyfinClient::new();
    client.set_config(config);

    match client.get_album_songs(&album_id).await {
        Ok(response) => Ok(MusicLibraryResult {
            success: true,
            message: "Album songs retrieved successfully".to_string(),
            items: Some(response.items),
            total_count: Some(response.total_record_count),
        }),
        Err(e) => Ok(MusicLibraryResult {
            success: false,
            message: format!("Failed to get album songs: {}", e),
            items: None,
            total_count: None,
        }),
    }
}

#[tauri::command]
pub async fn get_artist_songs(
    artist_id: String,
    state: State<'_, AppState>,
) -> Result<MusicLibraryResult, String> {
    let client_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match client_config {
        Some(config) => config,
        None => {
            return Ok(MusicLibraryResult {
                success: false,
                message: "Not authenticated".to_string(),
                items: None,
                total_count: None,
            });
        }
    };

    let mut client = JellyfinClient::new();
    client.set_config(config);

    match client.get_artist_songs(&artist_id).await {
        Ok(response) => Ok(MusicLibraryResult {
            success: true,
            message: "Artist songs retrieved successfully".to_string(),
            items: Some(response.items),
            total_count: Some(response.total_record_count),
        }),
        Err(e) => Ok(MusicLibraryResult {
            success: false,
            message: format!("Failed to get artist songs: {}", e),
            items: None,
            total_count: None,
        }),
    }
}

#[tauri::command]
pub async fn get_playlist_songs(
    playlist_id: String,
    limit: Option<i32>,
    start_index: Option<i32>,
    state: State<'_, AppState>,
) -> Result<MusicLibraryResult, String> {
    let client_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match client_config {
        Some(config) => config,
        None => {
            return Ok(MusicLibraryResult {
                success: false,
                message: "Not authenticated".to_string(),
                items: None,
                total_count: None,
            });
        }
    };

    let mut client = JellyfinClient::new();
    client.set_config(config);

    match client.get_playlist_songs(&playlist_id, limit, start_index).await {
        Ok(response) => Ok(MusicLibraryResult {
            success: true,
            message: "Playlist songs retrieved successfully".to_string(),
            items: Some(response.items),
            total_count: Some(response.total_record_count),
        }),
        Err(e) => Ok(MusicLibraryResult {
            success: false,
            message: format!("Failed to get playlist songs: {}", e),
            items: None,
            total_count: None,
        }),
    }
}

#[tauri::command]
pub async fn get_item(
    item_id: String,
    state: State<'_, AppState>,
) -> Result<ItemResult, String> {
    let client_config = {
        let client = state.jellyfin_client.lock().map_err(|e| e.to_string())?;
        client.get_config().cloned()
    };

    let config = match client_config {
        Some(config) => config,
        None => {
            return Ok(ItemResult {
                success: false,
                message: "Not authenticated".to_string(),
                item: None,
            });
        }
    };

    let mut client = JellyfinClient::new();
    client.set_config(config);

    match client.get_item(&item_id).await {
        Ok(item) => Ok(ItemResult {
            success: true,
            message: "Item retrieved successfully".to_string(),
            item: Some(item),
        }),
        Err(e) => Ok(ItemResult {
            success: false,
            message: format!("Failed to get item: {}", e),
            item: None,
        }),
    }
} 

use std::process::Command;

#[tauri::command]
pub async fn open_link(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;

        const DETACH: u32 = 0x00000008;
        const HIDE: u32 = 0x08000000;

        Command::new("cmd")
            .args(["/C", "start", &url])
            .creation_flags(HIDE | DETACH)
            .spawn()
            .map_err(|e| format!("Failed to open link on Windows: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open link on macOS: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        // On Linux, `xdg-open` is a common way to open URLs using the default browser.
        // It's part of xdg-utils, which is usually pre-installed on most desktop Linux distributions.
        Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open link on Linux: {}", e))?;
    }

    // Fallback for other operating systems or if none of the specific targets match.
    // This part might need more refinement depending on your target platforms.
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        eprintln!("Warning: open_link not explicitly supported on this OS.");
        // You might want to return an error or try a very generic command
        // that might not work everywhere.
        return Err("Unsupported operating system for opening links.".to_string());
    }

    Ok(())
}
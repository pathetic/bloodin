mod audio_player;
mod commands;
mod jellyfin;
mod storage;
mod audio_cache;

use commands::AppState;

// Keep the greet command for now as a test
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::connect_to_jellyfin,
            commands::get_server_info,
            commands::get_user_profile,
            commands::check_authentication,
            commands::logout,
            commands::get_songs,
            commands::get_albums,
            commands::get_random_songs,
            commands::get_recent_albums,
            commands::get_artists,
            commands::get_playlists,
            commands::get_album_songs,
            commands::get_artist_songs,
            commands::get_item,
            commands::search_music,
            commands::get_image_url,
            commands::get_stream_url,
            // Audio Player Commands
            commands::play_song,
            commands::pause_playback,
            commands::resume_playback,
            commands::stop_playback,
            commands::set_volume,
            commands::seek_to,
            commands::toggle_shuffle,
            commands::set_repeat_mode,
            commands::get_playback_state,
            commands::next_track,
            commands::previous_track
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use crate::jellyfin::JellyfinConfig;
use std::path::PathBuf;

pub async fn save_jellyfin_config(
    app_handle: &tauri::AppHandle,
    config: &JellyfinConfig,
) -> Result<(), Box<dyn std::error::Error>> {
    let store = tauri_plugin_store::StoreBuilder::new(app_handle, PathBuf::from("jellyfin.json")).build()?;
    
    // Store the configuration
    store.set("config", serde_json::to_value(config)?);
    store.save()?;
    
    Ok(())
}

pub async fn load_jellyfin_config(
    app_handle: &tauri::AppHandle,
) -> Result<Option<JellyfinConfig>, Box<dyn std::error::Error>> {
    let store = tauri_plugin_store::StoreBuilder::new(app_handle, PathBuf::from("jellyfin.json")).build()?;
    
    // Try to load the store (it might not exist on first run)
    if let Err(_) = store.reload() {
        return Ok(None);
    }
    
    match store.get("config") {
        Some(value) => {
            let config: JellyfinConfig = serde_json::from_value(value.clone())?;
            Ok(Some(config))
        }
        None => Ok(None),
    }
}

pub async fn clear_jellyfin_config(
    app_handle: &tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error>> {
    let store = tauri_plugin_store::StoreBuilder::new(app_handle, PathBuf::from("jellyfin.json")).build()?;
    
    store.delete("config");
    store.save()?;
    
    Ok(())
} 
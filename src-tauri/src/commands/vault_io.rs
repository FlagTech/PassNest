use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn vault_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("passnest.vault"))
}

#[tauri::command]
pub async fn read_vault(app: AppHandle) -> Result<Option<String>, String> {
    let path = vault_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    std::fs::read_to_string(&path)
        .map(Some)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_vault(app: AppHandle, data: String) -> Result<(), String> {
    let path = vault_path(&app)?;
    let tmp = path.with_extension("vault.tmp");
    std::fs::write(&tmp, &data).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_ai_token(app: AppHandle, token: String) -> Result<String, String> {
    let path = app_data_dir(&app)?.join("ai-token");
    std::fs::write(&path, &token).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_ai_token(app: AppHandle) -> Result<(), String> {
    let path = app_data_dir(&app)?.join("ai-token");
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_ai_token_path(app: AppHandle) -> Result<String, String> {
    let path = app_data_dir(&app)?.join("ai-token");
    Ok(path.to_string_lossy().to_string())
}

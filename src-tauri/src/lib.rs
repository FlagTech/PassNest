mod commands;

use commands::ai_server::{AiState, SharedAiState};
use std::sync::{Arc, Mutex};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ai_state: SharedAiState = Arc::new(Mutex::new(AiState::default()));

    tauri::Builder::default()
        .manage(ai_state.clone())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(move |app| {
            commands::ai_server::start(ai_state.clone(), app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::vault_io::read_vault,
            commands::vault_io::write_vault,
            commands::vault_io::write_ai_token,
            commands::vault_io::delete_ai_token,
            commands::vault_io::get_ai_token_path,
            commands::clipboard::secure_copy,
            commands::ai_server::sync_ai_server,
            commands::ai_server::clear_ai_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

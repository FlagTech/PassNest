use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

#[tauri::command]
pub async fn secure_copy(
    app: AppHandle,
    text: String,
    clear_after_ms: Option<u64>,
) -> Result<(), String> {
    let delay = clear_after_ms.unwrap_or(30_000);
    app.clipboard()
        .write_text(text)
        .map_err(|e| e.to_string())?;

    let handle = app.clone();
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
        let _ = handle.clipboard().write_text(String::new());
    });

    Ok(())
}

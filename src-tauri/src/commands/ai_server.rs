use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

pub const PORT: u16 = 7070;

// ── Shared state (synced from frontend on unlock/mutations) ──────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncEntry {
    pub id: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub label: String,
    pub url: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub service_name: Option<String>,
    pub key_value: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Default)]
pub struct AiState {
    pub entries: Vec<SyncEntry>,
    pub token: Option<String>,
    pub unlocked: bool,
}

pub type SharedAiState = Arc<Mutex<AiState>>;

// ── Axum state bundle (state + app handle for clipboard) ─────────────────────

#[derive(Clone)]
struct Bundle {
    state: SharedAiState,
    app: AppHandle,
}

// ── Response / request types ─────────────────────────────────────────────────

#[derive(Serialize)]
struct StatusRes {
    unlocked: bool,
    token_active: bool,
    port: u16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EntryMeta {
    id: String,
    #[serde(rename = "type")]
    entry_type: String,
    label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    service_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    expires_at: Option<String>,
}

#[derive(Deserialize)]
struct TokenQuery {
    token: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CopyBody {
    token: String,
    entry_id: String,
    field: String,
}

#[derive(Serialize)]
struct CopyRes {
    label: String,
    field: String,
}

#[derive(Serialize)]
struct ApiOk<T: Serialize> {
    success: bool,
    data: T,
}

#[derive(Serialize)]
struct ApiErr {
    success: bool,
    error: String,
}

fn ok<T: Serialize>(data: T) -> Json<ApiOk<T>> {
    Json(ApiOk { success: true, data })
}

fn unauthorized(msg: &str) -> (StatusCode, Json<ApiErr>) {
    (StatusCode::UNAUTHORIZED, Json(ApiErr { success: false, error: msg.to_string() }))
}

fn not_found(msg: &str) -> (StatusCode, Json<ApiErr>) {
    (StatusCode::NOT_FOUND, Json(ApiErr { success: false, error: msg.to_string() }))
}

fn server_err(msg: String) -> (StatusCode, Json<ApiErr>) {
    (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiErr { success: false, error: msg }))
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async fn status(State(b): State<Bundle>) -> Json<StatusRes> {
    let s = b.state.lock().unwrap();
    Json(StatusRes {
        unlocked: s.unlocked,
        token_active: s.unlocked && s.token.is_some(),
        port: PORT,
    })
}

async fn entries(
    State(b): State<Bundle>,
    Query(q): Query<TokenQuery>,
) -> Result<Json<ApiOk<Vec<EntryMeta>>>, (StatusCode, Json<ApiErr>)> {
    let s = b.state.lock().unwrap();
    if !s.unlocked {
        return Err(unauthorized("Vault is locked"));
    }
    if s.token.as_deref() != Some(q.token.as_str()) {
        return Err(unauthorized("Invalid token"));
    }
    let metas = s.entries.iter().map(|e| EntryMeta {
        id: e.id.clone(),
        entry_type: e.entry_type.clone(),
        label: e.label.clone(),
        url: e.url.clone(),
        username: e.username.clone(),
        service_name: e.service_name.clone(),
        expires_at: e.expires_at.clone(),
    }).collect();
    Ok(ok(metas))
}

async fn copy(
    State(b): State<Bundle>,
    Json(body): Json<CopyBody>,
) -> Result<Json<ApiOk<CopyRes>>, (StatusCode, Json<ApiErr>)> {
    let (value, label) = {
        let s = b.state.lock().unwrap();
        if !s.unlocked {
            return Err(unauthorized("Vault is locked"));
        }
        if s.token.as_deref() != Some(body.token.as_str()) {
            return Err(unauthorized("Invalid token"));
        }
        let entry = s.entries.iter()
            .find(|e| e.id == body.entry_id)
            .ok_or_else(|| not_found("Entry not found"))?;
        let value = match body.field.as_str() {
            "password" => entry.password.clone(),
            "username" => entry.username.clone(),
            "keyValue" => entry.key_value.clone(),
            _ => return Err(unauthorized("Invalid field")),
        }.ok_or_else(|| not_found("Field not available for this entry type"))?;
        (value, entry.label.clone())
    }; // lock released here

    b.app.clipboard().write_text(value).map_err(|e| server_err(e.to_string()))?;

    Ok(ok(CopyRes { label, field: body.field }))
}

// ── Server startup ────────────────────────────────────────────────────────────

pub fn start(state: SharedAiState, app: AppHandle) {
    let bundle = Bundle { state, app };
    let router = Router::new()
        .route("/status", get(status))
        .route("/entries", get(entries))
        .route("/copy", post(copy))
        .with_state(bundle);

    tauri::async_runtime::spawn(async move {
        let addr = format!("127.0.0.1:{PORT}");
        match tokio::net::TcpListener::bind(&addr).await {
            Ok(listener) => {
                if let Err(e) = axum::serve(listener, router).await {
                    eprintln!("[PassNest AI] server error: {e}");
                }
            }
            Err(e) => eprintln!("[PassNest AI] failed to bind {addr}: {e}"),
        }
    });
}

// ── Tauri commands (called from frontend to sync state) ───────────────────────

#[tauri::command]
pub async fn sync_ai_server(
    ai_state: tauri::State<'_, SharedAiState>,
    entries: Vec<SyncEntry>,
    token: Option<String>,
    unlocked: bool,
) -> Result<(), String> {
    let mut s = ai_state.lock().map_err(|e| e.to_string())?;
    s.entries = entries;
    s.token = token;
    s.unlocked = unlocked;
    Ok(())
}

#[tauri::command]
pub async fn clear_ai_server(
    ai_state: tauri::State<'_, SharedAiState>,
) -> Result<(), String> {
    let mut s = ai_state.lock().map_err(|e| e.to_string())?;
    s.entries.clear();
    s.token = None;
    s.unlocked = false;
    Ok(())
}

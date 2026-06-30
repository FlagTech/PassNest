# PassNest

本地加密的密碼與 API 金鑰管理工具，支援瀏覽器、Windows 與 macOS 桌面版。所有資料使用 AES-256-GCM 加密儲存於本機，永不上傳雲端。

## 功能特色

- **密碼管理**：儲存網站帳號密碼，支援自動產生強密碼
- **API 金鑰管理**：儲存 API 金鑰並追蹤到期日，即將到期時顯示警示
- **收藏**：常用條目加星號快速存取
- **加密保護**：AES-256-GCM 加密 + Argon2id 金鑰衍生
- **主密碼保護（選用）**：預設無密碼自動開啟，可在設定中啟用
- **自動鎖定**：啟用密碼保護後，閒置 15 分鐘自動鎖定
- **剪貼板安全**：複製後 3 分鐘自動清空剪貼板
- **AI 模式**：讓 AI 代理人安全存取，不暴露明文密碼
- **CLI API**：桌面版內建 HTTP 伺服器，AI 工具可用 `curl` 操作

---

## 下載

**Windows 免安裝執行檔**：前往 [Releases](https://github.com/FlagTech/PassNest/releases/latest) 下載 `PassNest-windows-x64.zip`，解壓後雙擊 `PassNest.exe` 即可執行，無需安裝。

---

## 快速開始

### 桌面版（Windows / macOS）

從 [Releases](https://github.com/FlagTech/PassNest/releases/latest) 下載 `PassNest-windows-x64.zip`，解壓後直接執行 `PassNest.exe`，不需安裝。

macOS 需自行從原始碼建置（見下方[建置](#建置桌面版)）。

### 瀏覽器版（開發模式）

```bash
npm install
npm run dev
```

開啟 `http://localhost:5173`

---

## 使用說明

### 1. 首次開啟

直接進入主畫面，無需設定密碼。若想啟用主密碼保護，前往側邊欄「設定」開啟。

### 2. 新增密碼條目

1. 側邊欄點選「密碼」
2. 右上角「+ 新增密碼」
3. 填入名稱、網址、帳號、密碼（可點擊骰子圖示自動產生）
4. 儲存後密碼以 `••••••••` 顯示，懸停可顯示明文

### 3. 新增 API 金鑰

1. 側邊欄點選「API 金鑰」
2. 右上角「+ 新增 API 金鑰」
3. 填入服務名稱、金鑰值、到期日（選填）
4. 到期日在 7 天內會顯示橘色「即將到期」徽章

### 4. 複製密碼

點擊條目列上的複製圖示，密碼即複製至剪貼板，**3 分鐘後自動清空**。

---

## 主密碼保護

PassNest 預設不需密碼，可在設定中按需開啟。

### 啟用

1. 側邊欄點選「設定」
2. 撥動「主密碼保護」開關
3. 設定密碼（至少 4 個字元）
4. 之後每次開啟需輸入密碼解鎖

### 關閉

1. 側邊欄點選「設定」
2. 撥動開關關閉
3. 輸入目前密碼確認

> **主密碼無法找回。** 忘記密碼將無法解密 Vault，只能刪除 `passnest.vault` 重新開始。

### 更改密碼

設定 → 更改主密碼 → 輸入目前密碼 + 新密碼。

---

## AI 模式

PassNest 提供兩種方式讓 AI 代理人安全操作，**AI 永遠無法直接取得密碼明文**，只能觸發「複製到剪貼板」動作。

### 啟用 Token

1. 側邊欄點選「AI 模式」
2. 點擊「產生 AI Token」
3. 複製 Token（只顯示一次）
4. 桌面版會自動將 Token 存至：
   - Windows：`%APPDATA%\com.passnest.app\ai-token`
   - macOS：`~/Library/Application Support/com.passnest.app/ai-token`

> Token 在 Vault 鎖定後自動失效，重新解鎖後需重新產生。

### AI 存取限制

| 操作 | 是否允許 |
|------|---------|
| 查看條目名稱、網址、帳號 | ✅ |
| 複製密碼到剪貼板（3 分鐘後清空） | ✅ |
| 讀取密碼或 API 金鑰明文 | ❌ |
| 新增、修改、刪除條目 | ❌ |

---

## 方式一：瀏覽器 JavaScript Bridge

在瀏覽器或 Tauri WebView 的開發者工具中，透過 `window.passNestAI` 物件操作。

```javascript
// 驗證
window.passNestAI.auth('your-token')
// → { success: true, message: "驗證成功..." }

// 列出所有條目（不含密碼值）
window.passNestAI.listEntries()
window.passNestAI.listEntries('password')  // 只列密碼
window.passNestAI.listEntries('apikey')    // 只列 API 金鑰

// 複製密碼到剪貼板（值不會出現在回傳中）
await window.passNestAI.copyCredential('<entry-id>', 'password')
// → { success: true, label: "Gmail", field: "password" }

// 查詢狀態
window.passNestAI.status()
// → { vaultUnlocked: true, tokenActive: true }
```

可用的 `field` 值：`"password"` / `"username"` / `"keyValue"`

---

## 方式二：CLI / HTTP API（桌面版專用）

桌面版 PassNest 啟動後會在 `127.0.0.1:7070` 開啟本地 HTTP 伺服器，AI 工具可用 `curl` 操作。

> 伺服器只綁定本機（127.0.0.1），外部無法存取。

### 端點總覽

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/status` | 查詢 vault 與 token 狀態 |
| GET | `/entries?token=<TOKEN>` | 列出所有條目（不含密碼值） |
| POST | `/copy` | 複製指定欄位到剪貼板 |

### 讀取 Token

```bash
# Windows (PowerShell)
$TOKEN = Get-Content "$env:APPDATA\com.passnest.app\ai-token"

# macOS
TOKEN=$(cat ~/Library/Application\ Support/com.passnest.app/ai-token)
```

### 查詢狀態

```bash
curl http://localhost:7070/status
# → {"unlocked":true,"token_active":true,"port":7070}
```

### 列出條目

```bash
curl "http://localhost:7070/entries?token=$TOKEN"
```

```json
{
  "success": true,
  "data": [
    { "id": "...", "type": "password", "label": "Gmail", "url": "https://gmail.com", "username": "me@gmail.com" },
    { "id": "...", "type": "apikey", "label": "OpenAI", "serviceName": "OpenAI API", "expiresAt": "2026-07-03" }
  ]
}
```

### 複製密碼到剪貼板

```bash
curl -X POST http://localhost:7070/copy \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"entryId\":\"<ID>\",\"field\":\"password\"}"
# → {"success":true,"data":{"label":"Gmail","field":"password"}}
```

`field` 可用值：`"password"` / `"username"` / `"keyValue"`

### 錯誤回應

| HTTP 狀態碼 | 說明 |
|------------|------|
| 401 | Token 無效，或 Vault 已鎖定 |
| 404 | 找不到指定條目或欄位 |
| 500 | 伺服器內部錯誤 |

```json
{ "success": false, "error": "Vault is locked" }
```

---

## 安全模型

```
（可選）主密碼 或 內部 sentinel 值
  └─ Argon2id (mem=64 MiB, t=3, p=4)
       └─ 256-bit 金鑰
            └─ AES-256-GCM (隨機 nonce)
                 └─ 加密 Vault JSON → passnest.vault
```

- 無論是否啟用主密碼，Vault 永遠以 AES-256-GCM 加密存放
- 每次寫入產生新的隨機 nonce，相同資料每次密文不同
- 金鑰只存在記憶體，鎖定時覆寫為 0
- Vault 使用原子寫入（先寫 `.tmp` 再 rename），防止崩潰損毀
- AI 伺服器只綁定 `127.0.0.1`，Token 鎖定後自動清除
- AI 操作不返回密碼明文，只寫入剪貼板

### Vault 檔案位置

| 平台 | 路徑 |
|------|------|
| Windows | `%APPDATA%\com.passnest.app\passnest.vault` |
| macOS | `~/Library/Application Support/com.passnest.app/passnest.vault` |
| 瀏覽器 | IndexedDB（`passnest` 資料庫） |

---

## 建置桌面版

### Windows（免安裝執行檔）

```bash
npm run tauri build
# 輸出：src-tauri/target/release/passnest.exe
```

### macOS（需在 Mac 上執行）

```bash
# 安裝前置工具
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

npm install
npm run tauri build
# 輸出：src-tauri/target/release/bundle/dmg/PassNest_*.dmg
```

### 瀏覽器靜態檔案

```bash
npm run build
# 輸出：dist/
```

---

## 開發

### 前置需求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) stable
- Windows：[WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)（Win 11 已內建）
- macOS：Xcode Command Line Tools

### 啟動開發模式

```bash
# 瀏覽器版
npm run dev

# 桌面版（首次編譯約 3 分鐘）
npm run tauri dev
```

### 技術棧

| 層次 | 技術 |
|------|------|
| 桌面殼層 | Tauri v2（Rust） |
| 前端框架 | React 19 + TypeScript + Vite 7 |
| 樣式 | Tailwind CSS v4（馬卡龍色系） |
| 狀態管理 | Zustand |
| 加密 | hash-wasm（Argon2id）+ @noble/ciphers（AES-256-GCM） |
| 表單驗證 | react-hook-form + zod |
| 瀏覽器儲存 | idb（IndexedDB） |
| 桌面儲存 | tauri-plugin-fs |
| CLI 伺服器 | axum（Rust HTTP） |
| 動畫 | framer-motion |

import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import { spawnSync } from 'child_process';

const PORT = 7070;
const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

function getTokenDir() {
  const p = platform();
  if (p === 'win32') {
    return join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'com.passnest.app');
  }
  if (p === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'com.passnest.app');
  }
  return join(homedir(), '.config', 'com.passnest.app');
}

// In-memory vault state — synced from browser via POST /sync
const state = { entries: [], token: null, unlocked: false };

// Load persisted token on startup so server restarts don't invalidate the token
try {
  const saved = readFileSync(join(getTokenDir(), 'ai-token'), 'utf8').trim();
  if (saved) {
    state.token = saved;
    console.log('[PassNest] Token loaded from file');
  }
} catch { /* file not created yet */ }

const AUTOTYPE_COOLDOWN_MS = 2000;
let lastAutotypeAt = 0;

// Runs a PowerShell script via -EncodedCommand (UTF-16LE base64) to avoid all quoting/escaping issues.
function runPowerShellScript(script) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  return spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { encoding: 'utf8' });
}

// Pastes `value` into whatever control currently has OS focus via a real native Ctrl+V,
// so the target page receives a genuine paste event instead of going through any
// extension-mediated (and therefore sandboxed) clipboard path. The value only ever
// exists inside this PowerShell child process and the real OS clipboard, and the
// clipboard is cleared immediately after the keystroke is sent.
function autotypePaste(value, expectedWindowTitle) {
  const b64Value = Buffer.from(value, 'utf-8').toString('base64');
  const b64Title = Buffer.from(expectedWindowTitle ?? '', 'utf-8').toString('base64');
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class PassNestWin32 {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
"@

$expected = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64Title}'))
if ($expected -ne '') {
  $hwnd = [PassNestWin32]::GetForegroundWindow()
  $sb = New-Object System.Text.StringBuilder 256
  [PassNestWin32]::GetWindowText($hwnd, $sb, 256) | Out-Null
  $title = $sb.ToString()
  if ($title -notlike "*$expected*") {
    Write-Output "FOCUS_MISMATCH:$title"
    exit 2
  }
}

$plain = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64Value}'))
Set-Clipboard -Value $plain
Start-Sleep -Milliseconds 120
[System.Windows.Forms.SendKeys]::SendWait('^v')
Start-Sleep -Milliseconds 80
Set-Clipboard -Value ''
Write-Output "OK"
`;
  return runPowerShellScript(script);
}

// GET /status
app.get('/status', (_req, res) => {
  res.json({ unlocked: state.unlocked, token_active: !!state.token, port: PORT });
});

// GET /entries?token=...
app.get('/entries', (req, res) => {
  if (!state.unlocked) return res.status(401).json({ success: false, error: 'Vault is locked' });
  if (req.query.token !== state.token) return res.status(401).json({ success: false, error: 'Invalid token' });
  const data = state.entries.map(e => ({
    id: e.id, type: e.type, label: e.label,
    ...(e.url       && { url: e.url }),
    ...(e.username  && { username: e.username }),
    ...(e.serviceName && { serviceName: e.serviceName }),
    ...(e.expiresAt && { expiresAt: e.expiresAt }),
  }));
  res.json({ success: true, data });
});

// POST /autotype — paste a credential field into whatever control currently has OS focus.
// The plaintext value never leaves this process: it is not included in any response.
app.post('/autotype', (req, res) => {
  const { token, entryId, field, expectedWindowTitle } = req.body ?? {};
  if (!state.unlocked) return res.status(401).json({ success: false, error: 'Vault is locked' });
  if (token !== state.token) return res.status(401).json({ success: false, error: 'Invalid token' });
  if (platform() !== 'win32') {
    return res.status(500).json({ success: false, error: 'Auto-type is only supported on Windows' });
  }

  const now = Date.now();
  if (now - lastAutotypeAt < AUTOTYPE_COOLDOWN_MS) {
    return res.status(429).json({ success: false, error: 'Too many auto-type requests, please wait' });
  }

  const entry = state.entries.find(e => e.id === entryId);
  if (!entry) return res.status(404).json({ success: false, error: 'Entry not found' });
  const value = { password: entry.password, username: entry.username, keyValue: entry.keyValue }[field];
  if (!value) return res.status(404).json({ success: false, error: 'Field not available' });

  lastAutotypeAt = now;
  try {
    const result = autotypePaste(value, expectedWindowTitle);
    const output = (result.stdout ?? '').trim();
    if (output.startsWith('FOCUS_MISMATCH')) {
      return res.status(409).json({ success: false, error: 'Foreground window does not match expected target' });
    }
    if (result.status !== 0 || !output.includes('OK')) {
      return res.status(500).json({ success: false, error: 'Auto-type failed' });
    }
    res.json({ success: true, data: { label: entry.label, field } });
  } catch {
    res.status(500).json({ success: false, error: 'Auto-type failed' });
  }
});

// GET /vault — read encrypted vault blob from disk
app.get('/vault', (_req, res) => {
  try {
    const data = readFileSync(join(getTokenDir(), 'vault.enc'), 'utf8');
    res.json({ success: true, data });
  } catch {
    res.json({ success: true, data: null });
  }
});

// POST /vault — write encrypted vault blob to disk
app.post('/vault', (req, res) => {
  const { data } = req.body ?? {};
  if (!data) return res.status(400).json({ success: false, error: 'Data required' });
  const dir = getTokenDir();
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'vault.enc'), data, 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

// POST /sync — browser calls this on unlock and after every vault mutation
app.post('/sync', (req, res) => {
  const { entries, token, unlocked } = req.body ?? {};
  state.entries = entries ?? [];
  state.token = token ?? null;
  state.unlocked = !!unlocked;
  res.json({ success: true });
});

// POST /token — write token to platform app-data directory
app.post('/token', (req, res) => {
  const { token } = req.body ?? {};
  if (!token) return res.status(400).json({ success: false, error: 'Token required' });
  const dir = getTokenDir();
  const filePath = join(dir, 'ai-token');
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, token, 'utf8');
    state.token = token;
    res.json({ success: true, data: { path: filePath } });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

// POST /revoke — clear state and delete token file
app.post('/revoke', (_req, res) => {
  state.token = null;
  state.unlocked = false;
  state.entries = [];
  try { unlinkSync(join(getTokenDir(), 'ai-token')); } catch {}
  res.json({ success: true });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[PassNest] AI server  → http://127.0.0.1:${PORT}`);
  console.log(`[PassNest] Token file → ${join(getTokenDir(), 'ai-token')}`);
});

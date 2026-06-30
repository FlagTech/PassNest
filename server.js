import express from 'express';
import cors from 'cors';
import { writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import { spawnSync } from 'child_process';

const PORT = 7070;
const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// In-memory vault state — synced from browser via POST /sync
const state = { entries: [], token: null, unlocked: false };

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

function copyToClipboard(text) {
  const p = platform();
  // Encode as base64 to avoid shell injection with special characters
  const b64 = Buffer.from(text, 'utf-8').toString('base64');
  if (p === 'win32') {
    spawnSync('powershell', [
      '-NoProfile', '-Command',
      `[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64}')) | Set-Clipboard`,
    ]);
  } else if (p === 'darwin') {
    spawnSync('sh', ['-c', `echo '${b64}' | base64 -d | pbcopy`]);
  }
}

// GET /status
app.get('/status', (_req, res) => {
  res.json({ unlocked: state.unlocked, token_active: state.unlocked && !!state.token, port: PORT });
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

// POST /copy
app.post('/copy', (req, res) => {
  const { token, entryId, field } = req.body ?? {};
  if (!state.unlocked) return res.status(401).json({ success: false, error: 'Vault is locked' });
  if (token !== state.token) return res.status(401).json({ success: false, error: 'Invalid token' });
  const entry = state.entries.find(e => e.id === entryId);
  if (!entry) return res.status(404).json({ success: false, error: 'Entry not found' });
  const value = { password: entry.password, username: entry.username, keyValue: entry.keyValue }[field];
  if (!value) return res.status(404).json({ success: false, error: 'Field not available' });
  try {
    copyToClipboard(value);
    // Clear clipboard after 3 minutes
    setTimeout(() => { try { copyToClipboard(''); } catch {} }, 180_000);
    res.json({ success: true, data: { label: entry.label, field } });
  } catch {
    res.status(500).json({ success: false, error: 'Clipboard write failed' });
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

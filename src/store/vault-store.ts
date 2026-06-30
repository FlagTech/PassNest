import { create } from "zustand";
import type { VaultEntry, VaultPayload } from "../types/vault";
import type { KdfParams } from "../types/crypto";
import type { EncryptedVault } from "../types/crypto";
import { createNewVault, unlockVault, saveVault, NO_PASSWORD_SENTINEL } from "../crypto/vault-codec";
import { KDF_PARAMS, deriveKey, generateSalt } from "../crypto/argon2";
import { zeroBytes } from "../crypto/utils";
import { getAdapter } from "../storage";
import { useAIStore } from "./ai-store";

const SERVER = "http://127.0.0.1:7070";

type VaultStatus = "idle" | "loading" | "unlocked" | "locked" | "error";

interface VaultState {
  status: VaultStatus;
  entries: VaultEntry[];
  errorMessage: string | null;
  passwordProtected: boolean;
  _key: Uint8Array | null;
  _kdfParams: KdfParams | null;

  initialize: () => Promise<void>;
  unlock: (masterPassword: string) => Promise<void>;
  lock: () => void;
  enablePassword: (newPassword: string) => Promise<void>;
  disablePassword: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  addEntry: (entry: Omit<VaultEntry, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateEntry: (id: string, patch: Partial<VaultEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
}

function toSyncEntry(e: VaultEntry) {
  if (e.type === "password") {
    return { id: e.id, type: e.type, label: e.label, url: e.url, username: e.username, password: e.password };
  }
  return { id: e.id, type: e.type, label: e.label, serviceName: e.serviceName, keyValue: e.keyValue, expiresAt: e.expiresAt };
}

export async function syncCli(entries: VaultEntry[], unlocked: boolean) {
  const token = useAIStore.getState().token ?? null;
  try {
    await fetch(`${SERVER}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: entries.map(toSyncEntry), token, unlocked }),
    });
  } catch {
    // Server is optional — silently ignore if not running
  }
}

async function persistVault(payload: VaultPayload, key: Uint8Array, kdfParams: KdfParams, passwordProtected: boolean) {
  const encrypted = await saveVault(payload, key, kdfParams, passwordProtected);
  await getAdapter().writeVault(JSON.stringify(encrypted));
  return encrypted;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  status: "idle",
  entries: [],
  errorMessage: null,
  passwordProtected: false,
  _key: null,
  _kdfParams: null,

  initialize: async () => {
    set({ status: "loading" });
    try {
      const adapter = getAdapter();
      const raw = await adapter.readVault();

      if (!raw) {
        const { encrypted, key, kdfParams } = await createNewVault();
        await adapter.writeVault(JSON.stringify(encrypted));
        set({ status: "unlocked", entries: [], _key: key, _kdfParams: kdfParams, passwordProtected: false });
        await syncCli([], true);
        return;
      }

      const encrypted = JSON.parse(raw) as EncryptedVault;
      const isProtected = encrypted.passwordProtected ?? true;

      if (!isProtected) {
        const { payload, key } = await unlockVault(NO_PASSWORD_SENTINEL, encrypted);
        set({ status: "unlocked", entries: payload.entries, _key: key, _kdfParams: encrypted.kdf, passwordProtected: false, errorMessage: null });
        await syncCli(payload.entries, true);
      } else {
        set({ status: "locked", passwordProtected: true });
      }
    } catch (e) {
      set({ status: "error", errorMessage: String(e) });
    }
  },

  unlock: async (masterPassword: string) => {
    set({ status: "loading", errorMessage: null });
    try {
      const adapter = getAdapter();
      const raw = await adapter.readVault();
      if (!raw) { await get().initialize(); return; }
      const encrypted = JSON.parse(raw) as EncryptedVault;
      const { payload, key } = await unlockVault(masterPassword, encrypted);
      set({ status: "unlocked", entries: payload.entries, _key: key, _kdfParams: encrypted.kdf, passwordProtected: true, errorMessage: null });
      await syncCli(payload.entries, true);
    } catch (e) {
      const msg = String(e);
      const isWrongPassword = msg.includes("invalid tag") || msg.includes("authentication");
      set({ status: "locked", errorMessage: isWrongPassword ? "密碼錯誤，請重試" : msg });
    }
  },

  lock: () => {
    const key = get()._key;
    if (key) zeroBytes(key);
    set({ status: "locked", entries: [], _key: null, _kdfParams: null, errorMessage: null });
    fetch(`${SERVER}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: [], token: null, unlocked: false }),
    }).catch(() => {});
  },

  enablePassword: async (newPassword: string) => {
    const { _key, entries } = get();
    if (!_key) return;
    const saltB64 = generateSalt();
    const newKdfParams: KdfParams = { algorithm: "argon2id", ...KDF_PARAMS, saltB64 };
    const newKey = await deriveKey(newPassword, saltB64);
    await persistVault({ schemaVersion: 1, entries }, newKey, newKdfParams, true);
    zeroBytes(_key);
    set({ _key: newKey, _kdfParams: newKdfParams, passwordProtected: true });
    await syncCli(entries, true);
  },

  disablePassword: async () => {
    const { _key, entries } = get();
    if (!_key) return;
    const saltB64 = generateSalt();
    const newKdfParams: KdfParams = { algorithm: "argon2id", ...KDF_PARAMS, saltB64 };
    const sentinelKey = await deriveKey(NO_PASSWORD_SENTINEL, saltB64);
    await persistVault({ schemaVersion: 1, entries }, sentinelKey, newKdfParams, false);
    zeroBytes(_key);
    set({ _key: sentinelKey, _kdfParams: newKdfParams, passwordProtected: false });
    await syncCli(entries, true);
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const raw = await getAdapter().readVault();
    if (!raw) return;
    const existing = JSON.parse(raw) as EncryptedVault;
    await unlockVault(currentPassword, existing);
    const { _key, entries } = get();
    if (!_key) return;
    const saltB64 = generateSalt();
    const newKdfParams: KdfParams = { algorithm: "argon2id", ...KDF_PARAMS, saltB64 };
    const newKey = await deriveKey(newPassword, saltB64);
    await persistVault({ schemaVersion: 1, entries }, newKey, newKdfParams, true);
    zeroBytes(_key);
    set({ _key: newKey, _kdfParams: newKdfParams });
  },

  addEntry: async (entryData) => {
    const { _key, _kdfParams, entries, passwordProtected } = get();
    if (!_key || !_kdfParams) return;
    const now = new Date().toISOString();
    const newEntry = { ...entryData, id: crypto.randomUUID(), createdAt: now, updatedAt: now } as VaultEntry;
    const newEntries = [...entries, newEntry];
    await persistVault({ schemaVersion: 1, entries: newEntries }, _key, _kdfParams, passwordProtected);
    set({ entries: newEntries });
    await syncCli(newEntries, true);
  },

  updateEntry: async (id, patch) => {
    const { _key, _kdfParams, entries, passwordProtected } = get();
    if (!_key || !_kdfParams) return;
    const newEntries = entries.map((e) => e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } as VaultEntry : e);
    await persistVault({ schemaVersion: 1, entries: newEntries }, _key, _kdfParams, passwordProtected);
    set({ entries: newEntries });
    await syncCli(newEntries, true);
  },

  deleteEntry: async (id) => {
    const { _key, _kdfParams, entries, passwordProtected } = get();
    if (!_key || !_kdfParams) return;
    const newEntries = entries.filter((e) => e.id !== id);
    await persistVault({ schemaVersion: 1, entries: newEntries }, _key, _kdfParams, passwordProtected);
    set({ entries: newEntries });
    await syncCli(newEntries, true);
  },

  toggleFavorite: async (id) => {
    const entry = get().entries.find((e) => e.id === id);
    if (!entry) return;
    await get().updateEntry(id, { isFavorite: !entry.isFavorite });
  },
}));

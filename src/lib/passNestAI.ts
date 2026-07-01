/**
 * PassNest AI Bridge
 *
 * Exposes window.passNestAI for AI agents (Codex Chrome extension).
 * - No master password required (token-based auth)
 * - Cannot read credential values
 * - Token issued by user from within PassNest UI
 */

import { useVaultStore } from "../store/vault-store";
import { useAIStore } from "../store/ai-store";
import type { VaultEntry } from "../types/vault";

type EntryMeta =
  | { id: string; type: "password"; label: string; url: string; username: string }
  | { id: string; type: "apikey"; label: string; serviceName: string; expiresAt: string | null };

interface PassNestAIBridge {
  auth(token: string): { success: boolean; message: string };
  listEntries(type?: "password" | "apikey"): { entries: EntryMeta[] } | { error: string };
  status(): { vaultUnlocked: boolean; tokenActive: boolean };
}

function toMeta(entry: VaultEntry): EntryMeta {
  if (entry.type === "password") {
    return { id: entry.id, type: "password", label: entry.label, url: entry.url, username: entry.username };
  }
  return { id: entry.id, type: "apikey", label: entry.label, serviceName: entry.serviceName, expiresAt: entry.expiresAt };
}

let _authenticated = false;

export function mountPassNestAI(): void {
  const bridge: PassNestAIBridge = {
    auth(token: string) {
      const { token: validToken, enabled } = useAIStore.getState();
      const { status } = useVaultStore.getState();
      if (!enabled || !validToken) {
        _authenticated = false;
        return { success: false, message: "AI 模式未啟用。請在 PassNest 中產生 AI Token。" };
      }
      if (status !== "unlocked") {
        _authenticated = false;
        return { success: false, message: "Vault 已鎖定。請先在 PassNest 輸入主密碼解鎖。" };
      }
      if (token !== validToken) {
        _authenticated = false;
        return { success: false, message: "Token 無效或已撤銷。" };
      }
      _authenticated = true;
      return { success: true, message: "驗證成功。可以使用 listEntries()。" };
    },

    listEntries(type) {
      const { status, entries } = useVaultStore.getState();
      if (!_authenticated) return { error: "請先呼叫 auth(token) 驗證。" };
      if (status !== "unlocked") { _authenticated = false; return { error: "Vault 已鎖定，請重新解鎖後再試。" }; }
      const filtered = type ? entries.filter((e) => e.type === type) : entries;
      return { entries: filtered.map(toMeta) };
    },

    status() {
      const { status } = useVaultStore.getState();
      const { enabled, token } = useAIStore.getState();
      return { vaultUnlocked: status === "unlocked", tokenActive: enabled && !!token };
    },
  };

  (window as unknown as Record<string, unknown>).passNestAI = bridge;
}

export function unmountPassNestAI(): void {
  delete (window as unknown as Record<string, unknown>).passNestAI;
  _authenticated = false;
}

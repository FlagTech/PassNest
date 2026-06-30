/**
 * PassNest AI Bridge
 *
 * Exposes window.passNestAI for AI agents.
 * - No master password required (token-based auth)
 * - Cannot read credential values — copy-to-clipboard only
 * - Token issued by user from within PassNest UI
 */

import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../storage";
import { useVaultStore } from "../store/vault-store";
import { useAIStore } from "../store/ai-store";
import type { VaultEntry } from "../types/vault";

const CLIPBOARD_CLEAR_MS = 180_000; // 3 minutes

type EntryMeta =
  | { id: string; type: "password"; label: string; url: string; username: string }
  | { id: string; type: "apikey"; label: string; serviceName: string; expiresAt: string | null };

interface PassNestAIBridge {
  /** Authenticate with the AI token issued by the user */
  auth(token: string): { success: boolean; message: string };
  /** List entries (no passwords/keys returned) */
  listEntries(type?: "password" | "apikey"): { entries: EntryMeta[] } | { error: string };
  /** Copy a credential field to clipboard — value never returned */
  copyCredential(
    entryId: string,
    field: "password" | "username" | "keyValue"
  ): Promise<{ success: boolean; label?: string; field?: string } | { error: string }>;
  /** Check vault and token status */
  status(): { vaultUnlocked: boolean; tokenActive: boolean };
}

async function clipboardWrite(text: string): Promise<void> {
  if (isTauri()) {
    await invoke("secure_copy", { text, clearAfterMs: CLIPBOARD_CLEAR_MS });
  } else {
    await navigator.clipboard.writeText(text);
    setTimeout(() => navigator.clipboard.writeText("").catch(() => {}), CLIPBOARD_CLEAR_MS);
  }
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
      return { success: true, message: "驗證成功。可以使用 listEntries() 和 copyCredential()。" };
    },

    listEntries(type) {
      const { status, entries } = useVaultStore.getState();
      if (!_authenticated) return { error: "請先呼叫 auth(token) 驗證。" };
      if (status !== "unlocked") {
        _authenticated = false;
        return { error: "Vault 已鎖定，請重新解鎖後再試。" };
      }
      const filtered = type ? entries.filter((e) => e.type === type) : entries;
      return { entries: filtered.map(toMeta) };
    },

    async copyCredential(entryId, field) {
      const { status, entries } = useVaultStore.getState();
      if (!_authenticated) return { error: "請先呼叫 auth(token) 驗證。" };
      if (status !== "unlocked") {
        _authenticated = false;
        return { error: "Vault 已鎖定，請重新解鎖後再試。" };
      }

      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return { error: `找不到 ID 為 '${entryId}' 的條目。` };

      let value: string | undefined;
      if (field === "username" && entry.type === "password") value = entry.username;
      else if (field === "password" && entry.type === "password") value = entry.password;
      else if (field === "keyValue" && entry.type === "apikey") value = entry.keyValue;

      if (value === undefined) {
        return { error: `欄位 '${field}' 在此條目類型中不存在。` };
      }

      await clipboardWrite(value);

      // Return success — the actual value is NEVER returned
      return { success: true, label: entry.label, field };
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

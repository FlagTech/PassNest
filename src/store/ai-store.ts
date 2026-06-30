import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../storage";

interface AIState {
  token: string | null;
  enabled: boolean;
  createdAt: string | null;
  tokenFilePath: string | null;

  generateToken: () => Promise<string>;
  revokeToken: () => Promise<void>;
  loadTokenPath: () => Promise<void>;
}

function randomToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const useAIStore = create<AIState>((set) => ({
  token: null,
  enabled: false,
  createdAt: null,
  tokenFilePath: null,

  generateToken: async () => {
    const token = randomToken();
    let filePath: string | null = null;
    if (isTauri()) {
      try {
        filePath = await invoke<string>("write_ai_token", { token });
      } catch (e) {
        console.error("Failed to write AI token file:", e);
      }
    }
    set({ token, enabled: true, createdAt: new Date().toISOString(), tokenFilePath: filePath });
    return token;
  },

  revokeToken: async () => {
    if (isTauri()) {
      try {
        await invoke("delete_ai_token");
        await invoke("clear_ai_server");
      } catch (e) {
        console.error("Failed to revoke AI token:", e);
      }
    }
    set({ token: null, enabled: false, createdAt: null, tokenFilePath: null });
  },

  loadTokenPath: async () => {
    if (!isTauri()) return;
    try {
      const filePath = await invoke<string>("get_ai_token_path");
      set({ tokenFilePath: filePath });
    } catch {
      // ignore
    }
  },
}));

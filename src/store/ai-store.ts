import { create } from "zustand";

const SERVER = "http://127.0.0.1:7070";

interface AIState {
  token: string | null;
  enabled: boolean;
  createdAt: string | null;
  tokenFilePath: string | null;

  generateToken: () => Promise<string>;
  revokeToken: () => Promise<void>;
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
    try {
      const res = await fetch(`${SERVER}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) filePath = data.data.path;
    } catch {
      // Server not running — token still works for window.passNestAI
    }
    set({ token, enabled: true, createdAt: new Date().toISOString(), tokenFilePath: filePath });
    return token;
  },

  revokeToken: async () => {
    try {
      await fetch(`${SERVER}/revoke`, { method: "POST" });
    } catch {}
    set({ token: null, enabled: false, createdAt: null, tokenFilePath: null });
  },
}));

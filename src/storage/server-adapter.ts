import type { StorageAdapter } from "./adapter";
import { BrowserAdapter } from "./browser-adapter";

const SERVER = "http://127.0.0.1:7070";

export class ServerAdapter implements StorageAdapter {
  supportsNativePath = true;
  private fallback = new BrowserAdapter();

  async readVault(): Promise<string | null> {
    try {
      const res = await fetch(`${SERVER}/vault`);
      const json = await res.json();
      if (json.success && json.data) return json.data;
      // Server vault is empty — migrate from IndexedDB if data exists there
      const local = await this.fallback.readVault();
      if (local) {
        await this.writeVault(local);
        console.log("[PassNest] Vault migrated from IndexedDB to local file");
      }
      return local;
    } catch {
      return this.fallback.readVault();
    }
  }

  async writeVault(data: string): Promise<void> {
    try {
      const res = await fetch(`${SERVER}/vault`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) throw new Error("server error");
    } catch {
      await this.fallback.writeVault(data);
    }
  }

  async exportVault(): Promise<void> {
    const data = await this.readVault();
    if (!data) return;
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "passnest.vault";
    a.click();
    URL.revokeObjectURL(url);
  }

  async importVault(file: File): Promise<void> {
    const text = await file.text();
    JSON.parse(text); // validate JSON
    await this.writeVault(text);
  }
}

import { openDB } from "idb";
import type { StorageAdapter } from "./adapter";

const getDb = () =>
  openDB("passnest", 1, {
    upgrade(db) {
      db.createObjectStore("kv");
    },
  });

export class BrowserAdapter implements StorageAdapter {
  supportsNativePath = false;

  async readVault(): Promise<string | null> {
    const db = await getDb();
    return (await db.get("kv", "vault")) ?? null;
  }

  async writeVault(data: string): Promise<void> {
    const db = await getDb();
    await db.put("kv", data, "vault");
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

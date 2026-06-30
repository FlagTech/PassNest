import { invoke } from "@tauri-apps/api/core";
import type { StorageAdapter } from "./adapter";

export class TauriAdapter implements StorageAdapter {
  supportsNativePath = true;

  async readVault(): Promise<string | null> {
    return invoke<string | null>("read_vault");
  }

  async writeVault(data: string): Promise<void> {
    await invoke("write_vault", { data });
  }
}

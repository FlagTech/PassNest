import type { StorageAdapter } from "./adapter";
import { TauriAdapter } from "./tauri-adapter";
import { BrowserAdapter } from "./browser-adapter";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let _adapter: StorageAdapter | null = null;

export function getAdapter(): StorageAdapter {
  if (!_adapter) {
    _adapter = isTauri() ? new TauriAdapter() : new BrowserAdapter();
  }
  return _adapter;
}

export type { StorageAdapter };
export { BrowserAdapter };

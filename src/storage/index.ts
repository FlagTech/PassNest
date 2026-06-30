import type { StorageAdapter } from "./adapter";
import { BrowserAdapter } from "./browser-adapter";

export function getAdapter(): StorageAdapter {
  return new BrowserAdapter();
}

export type { StorageAdapter };
export { BrowserAdapter };

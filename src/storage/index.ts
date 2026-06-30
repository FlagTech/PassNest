import type { StorageAdapter } from "./adapter";
import { ServerAdapter } from "./server-adapter";

export function getAdapter(): StorageAdapter {
  return new ServerAdapter();
}

export type { StorageAdapter };
export { ServerAdapter };

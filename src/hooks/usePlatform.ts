import { isTauri } from "../storage";

export function usePlatform() {
  const tauri = isTauri();
  return { isTauri: tauri, isBrowser: !tauri };
}

import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../storage";

export function useClipboard() {
  const copy = async (text: string, clearAfterMs = 30_000) => {
    if (isTauri()) {
      await invoke("secure_copy", { text, clearAfterMs });
    } else {
      await navigator.clipboard.writeText(text);
      setTimeout(() => navigator.clipboard.writeText(""), clearAfterMs);
    }
  };
  return { copy };
}

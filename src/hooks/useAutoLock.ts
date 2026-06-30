import { useEffect, useRef } from "react";
import { useVaultStore } from "../store/vault-store";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export function useAutoLock() {
  const status = useVaultStore((s) => s.status);
  const lock = useVaultStore((s) => s.lock);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== "unlocked") return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(lock, IDLE_TIMEOUT_MS);
    };

    const events = ["pointermove", "keydown", "pointerdown", "wheel"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [status, lock]);
}

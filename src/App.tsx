import { useEffect } from "react";
import { useVaultStore, syncCli } from "./store/vault-store";
import { useAIStore } from "./store/ai-store";
import { UnlockScreen } from "./components/vault/UnlockScreen";
import { AppShell } from "./components/layout/AppShell";
import { Spinner } from "./components/ui/Spinner";
import { mountPassNestAI, unmountPassNestAI } from "./lib/passNestAI";

export function App() {
  const status = useVaultStore((s) => s.status);
  const initialize = useVaultStore((s) => s.initialize);
  const aiToken = useAIStore((s) => s.token);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Mount / unmount the AI bridge based on vault status
  useEffect(() => {
    if (status === "unlocked") {
      mountPassNestAI();
    } else {
      unmountPassNestAI();
      if (status === "locked") {
        void useAIStore.getState().revokeToken();
      }
    }
  }, [status]);

  // Re-sync CLI server when AI token changes (token generated/revoked while unlocked)
  useEffect(() => {
    if (status === "unlocked") {
      const { entries } = useVaultStore.getState();
      void syncCli(entries, true);
    }
  }, [aiToken, status]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="w-10 h-10" />
          <p className="text-sm text-slate-light">載入中...</p>
        </div>
      </div>
    );
  }

  if (status === "locked") return <UnlockScreen />;
  if (status === "unlocked") return <AppShell />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-center text-red-500">
        <p className="font-semibold">發生錯誤</p>
        <p className="text-sm mt-1">{useVaultStore.getState().errorMessage}</p>
      </div>
    </div>
  );
}

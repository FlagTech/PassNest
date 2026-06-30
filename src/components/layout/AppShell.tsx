import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useUIStore } from "../../store/ui-store";
import { useAutoLock } from "../../hooks/useAutoLock";
import { PasswordsScreen } from "../../screens/PasswordsScreen";
import { ApiKeysScreen } from "../../screens/ApiKeysScreen";

export function AppShell() {
  const currentView = useUIStore((s) => s.currentView);
  useAutoLock();

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          {currentView === "passwords" ? <PasswordsScreen /> : <ApiKeysScreen />}
        </main>
      </div>
    </div>
  );
}

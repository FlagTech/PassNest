import { useState } from "react";
import { KeyRound, Terminal, Star, Lock, ShieldCheck, Bot, Settings } from "lucide-react";
import { useUIStore } from "../../store/ui-store";
import { useVaultStore } from "../../store/vault-store";
import { useAIStore } from "../../store/ai-store";
import { AIMode } from "../ai/AIMode";
import { SettingsModal } from "../settings/SettingsModal";
import { cn } from "../../lib/cn";

export function Sidebar() {
  const currentView = useUIStore((s) => s.currentView);
  const setView = useUIStore((s) => s.setView);
  const lock = useVaultStore((s) => s.lock);
  const passwordProtected = useVaultStore((s) => s.passwordProtected);
  const aiEnabled = useAIStore((s) => s.enabled);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const items = [
    { id: "passwords" as const, label: "密碼", icon: KeyRound },
    { id: "apikeys" as const, label: "API 金鑰", icon: Terminal },
  ];

  return (
    <aside className="w-56 bg-white border-r border-purple-light/30 flex flex-col h-full">
      <div className="p-5 flex items-center gap-3 border-b border-purple-light/20">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-light to-purple-light flex items-center justify-center shadow-sm">
          <ShieldCheck size={18} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-slate text-sm">PassNest</div>
          <div className="text-xs text-slate-light">本地加密保管</div>
        </div>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 w-full text-left",
              currentView === id
                ? "bg-pink text-white shadow-sm"
                : "text-slate hover:bg-pink-light/30"
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}

        <div className="my-1 border-t border-purple-light/20" />

        <button
          onClick={() => useUIStore.getState().setFilter("favorites")}
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium text-slate hover:bg-pink-light/30 transition-all duration-200 w-full text-left"
        >
          <Star size={16} className="text-pink" />
          收藏
        </button>

        <button
          onClick={() => setAiModalOpen(true)}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 w-full text-left",
            aiEnabled ? "text-purple hover:bg-purple-light/30" : "text-slate hover:bg-pink-light/30"
          )}
        >
          <Bot size={16} className={aiEnabled ? "text-purple" : ""} />
          <span>AI 模式</span>
          {aiEnabled && (
            <span className="ml-auto w-2 h-2 rounded-full bg-mint shrink-0" title="已啟用" />
          )}
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium text-slate hover:bg-pink-light/30 transition-all duration-200 w-full text-left"
        >
          <Settings size={16} />
          設定
        </button>
      </nav>

      {passwordProtected && (
        <div className="p-3 border-t border-purple-light/20">
          <button
            onClick={lock}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium text-slate-light hover:bg-red-50 hover:text-red-500 transition-all duration-200 w-full text-left"
          >
            <Lock size={16} />
            鎖定
          </button>
        </div>
      )}

      <AIMode open={aiModalOpen} onClose={() => setAiModalOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </aside>
  );
}

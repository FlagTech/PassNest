import { Search, Plus } from "lucide-react";
import { useUIStore } from "../../store/ui-store";
import { Button } from "../ui/Button";
import { getAdapter } from "../../storage";

export function TopBar() {
  const { currentView, searchQuery, setSearch, openModal } = useUIStore();

  const isPasswords = currentView === "passwords";
  const label = isPasswords ? "密碼" : "API 金鑰";
  const modalType = isPasswords ? "add-password" : "add-apikey";

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".vault,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await getAdapter().importVault(file);
        window.location.reload();
      } catch {
        alert("匯入失敗，請確認檔案格式");
      }
    };
    input.click();
  };

  const handleExport = async () => {
    await getAdapter().exportVault();
  };

  return (
    <header className="h-16 bg-white border-b border-purple-light/30 flex items-center px-5 gap-3 shrink-0">
      <div className="flex-1 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-light" />
        <input
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`搜尋${label}...`}
          className="w-full pl-9 pr-4 py-2 rounded-2xl border-2 border-purple-light text-sm text-slate bg-cream focus:border-pink focus:outline-none transition-colors placeholder:text-slate-light/50"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={handleExport}>匯出備份</Button>
        <Button variant="ghost" size="sm" onClick={handleImport}>匯入備份</Button>
      </div>

      <Button size="sm" onClick={() => openModal(modalType)}>
        <Plus size={14} />
        新增{label}
      </Button>
    </header>
  );
}

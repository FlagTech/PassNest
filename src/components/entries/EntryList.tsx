import { useMemo } from "react";
import { Inbox } from "lucide-react";
import { useVaultStore } from "../../store/vault-store";
import { useUIStore } from "../../store/ui-store";
import { EntryCard } from "./EntryCard";
import type { VaultEntry } from "../../types/vault";

function matchesSearch(entry: VaultEntry, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const fields = [
    entry.label,
    entry.notes,
    entry.type === "password" ? `${entry.url} ${entry.username}` : entry.serviceName,
  ];
  return fields.some((f) => f.toLowerCase().includes(q));
}

interface EntryListProps {
  type: "password" | "apikey";
}

export function EntryList({ type }: EntryListProps) {
  const entries = useVaultStore((s) => s.entries);
  const { searchQuery, filterType, sortField, sortDirection } = useUIStore();

  const filtered = useMemo(() => {
    let result = entries.filter((e) => e.type === type);

    if (filterType === "favorites") result = result.filter((e) => e.isFavorite);
    if (filterType === "expiring") {
      result = result.filter(
        (e) =>
          e.type === "apikey" &&
          e.expiresAt &&
          new Date(e.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
      );
    }

    result = result.filter((e) => matchesSearch(e, searchQuery));

    result.sort((a, b) => {
      const va = a[sortField as keyof VaultEntry] as string ?? "";
      const vb = b[sortField as keyof VaultEntry] as string ?? "";
      return sortDirection === "asc"
        ? va.localeCompare(vb)
        : vb.localeCompare(va);
    });

    return result;
  }, [entries, type, filterType, searchQuery, sortField, sortDirection]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-light py-20">
        <div className="w-16 h-16 rounded-3xl bg-purple-light/30 flex items-center justify-center">
          <Inbox size={28} className="text-purple" />
        </div>
        <p className="text-sm font-medium">
          {searchQuery ? "找不到相符的項目" : "還沒有任何項目"}
        </p>
        {!searchQuery && (
          <p className="text-xs text-slate-light/70">點擊右上角「新增」來建立第一筆資料</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {filtered.map((entry) => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

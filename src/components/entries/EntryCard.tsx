import { useState } from "react";
import { Copy, Edit, Trash2, Star, Eye, EyeOff, AlertTriangle } from "lucide-react";
import type { VaultEntry } from "../../types/vault";
import { useUIStore } from "../../store/ui-store";
import { useVaultStore } from "../../store/vault-store";
import { useClipboard } from "../../hooks/useClipboard";
import { cn } from "../../lib/cn";
import { Badge } from "../ui/Badge";

interface EntryCardProps {
  entry: VaultEntry;
}

function isExpiringSoon(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

export function EntryCard({ entry }: EntryCardProps) {
  const { copy } = useClipboard();
  const selectedEntryId = useUIStore((s) => s.selectedEntryId);
  const selectEntry = useUIStore((s) => s.selectEntry);
  const openModal = useUIStore((s) => s.openModal);
  const toggleFavorite = useVaultStore((s) => s.toggleFavorite);
  const [showSecret, setShowSecret] = useState(false);

  const isSelected = selectedEntryId === entry.id;
  const secret = entry.type === "password" ? entry.password : entry.keyValue;
  const subtitle = entry.type === "password" ? entry.url || entry.username : entry.serviceName;
  const expiry = entry.type === "apikey" ? entry.expiresAt : null;
  const expiring = isExpiringSoon(expiry);
  const expired = isExpired(expiry);

  return (
    <div
      onClick={() => selectEntry(isSelected ? null : entry.id)}
      className={cn(
        "group bg-white rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200",
        "hover:border-pink hover:shadow-card",
        isSelected
          ? "border-pink shadow-card"
          : "border-purple-light/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
          style={{
            background: entry.type === "password" ? "#FFB3C6" : "#E1BEE7",
            color: entry.type === "password" ? "#E07094" : "#B060C0",
          }}
        >
          {entry.label.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate text-sm truncate">{entry.label}</span>
            {entry.isFavorite && <Star size={12} className="text-pink fill-pink shrink-0" />}
            {expired && <Badge variant="orange"><AlertTriangle size={10} className="mr-1" />已到期</Badge>}
            {!expired && expiring && <Badge variant="orange">即將到期</Badge>}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-light truncate mt-0.5">{subtitle}</p>
          )}

          <div className="flex items-center gap-1.5 mt-2">
            <code className="text-xs bg-cream rounded-lg px-2 py-1 font-mono text-slate flex-1 truncate">
              {showSecret ? secret : "•".repeat(Math.min(secret.length, 20))}
            </code>
            <button
              onClick={(e) => { e.stopPropagation(); setShowSecret(!showSecret); }}
              className="p-1 rounded-lg text-slate-light hover:text-pink transition-colors"
            >
              {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); copy(secret); }}
              className="p-1 rounded-lg text-slate-light hover:text-pink transition-colors"
              title="複製（30秒後自動清空）"
            >
              <Copy size={13} />
            </button>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(entry.id); }}
            className={cn(
              "p-1.5 rounded-xl transition-colors",
              entry.isFavorite
                ? "text-pink hover:bg-pink-light/30"
                : "text-slate-light hover:text-pink hover:bg-pink-light/30"
            )}
          >
            <Star size={14} className={entry.isFavorite ? "fill-pink" : ""} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openModal("edit", entry.id); }}
            className="p-1.5 rounded-xl text-slate-light hover:text-purple hover:bg-purple-light/30 transition-colors"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openModal("delete", entry.id); }}
            className="p-1.5 rounded-xl text-slate-light hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

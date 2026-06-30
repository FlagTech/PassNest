import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useVaultStore } from "../../store/vault-store";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface DeleteConfirmProps {
  entryId: string;
  onClose: () => void;
}

export function DeleteConfirm({ entryId, onClose }: DeleteConfirmProps) {
  const entries = useVaultStore((s) => s.entries);
  const deleteEntry = useVaultStore((s) => s.deleteEntry);
  const [confirm, setConfirm] = useState("");

  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return null;

  const isConfirmed = confirm === entry.label;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    await deleteEntry(entryId);
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-red-50 rounded-2xl p-4 text-sm text-red-700">
        此操作無法復原。請輸入 <strong>「{entry.label}」</strong> 來確認刪除。
      </div>
      <Input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={`輸入「${entry.label}」來確認`}
      />
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button variant="danger" onClick={handleDelete} disabled={!isConfirmed}>
          <Trash2 size={14} />
          確認刪除
        </Button>
      </div>
    </div>
  );
}

import { useUIStore } from "../store/ui-store";
import { useVaultStore } from "../store/vault-store";
import { EntryList } from "../components/entries/EntryList";
import { Modal } from "../components/ui/Modal";
import { PasswordForm } from "../components/entries/PasswordForm";
import { DeleteConfirm } from "../components/entries/DeleteConfirm";
import type { PasswordEntry } from "../types/vault";

export function PasswordsScreen() {
  const { modalOpen, editEntryId, deleteEntryId, closeModal } = useUIStore();
  const entries = useVaultStore((s) => s.entries);

  const editEntry = editEntryId
    ? (entries.find((e) => e.id === editEntryId) as PasswordEntry | undefined)
    : undefined;

  return (
    <div className="flex-1 overflow-y-auto">
      <EntryList type="password" />

      <Modal
        open={modalOpen === "add-password"}
        onClose={closeModal}
        title="新增密碼"
      >
        <PasswordForm onClose={closeModal} />
      </Modal>

      <Modal
        open={modalOpen === "edit" && editEntry?.type === "password"}
        onClose={closeModal}
        title="編輯密碼"
      >
        {editEntry && <PasswordForm editEntry={editEntry as PasswordEntry} onClose={closeModal} />}
      </Modal>

      <Modal
        open={modalOpen === "delete" && !!deleteEntryId}
        onClose={closeModal}
        title="刪除項目"
      >
        {deleteEntryId && <DeleteConfirm entryId={deleteEntryId} onClose={closeModal} />}
      </Modal>
    </div>
  );
}

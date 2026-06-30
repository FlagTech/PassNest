import { useUIStore } from "../store/ui-store";
import { useVaultStore } from "../store/vault-store";
import { EntryList } from "../components/entries/EntryList";
import { Modal } from "../components/ui/Modal";
import { ApiKeyForm } from "../components/entries/ApiKeyForm";
import { DeleteConfirm } from "../components/entries/DeleteConfirm";
import type { ApiKeyEntry } from "../types/vault";

export function ApiKeysScreen() {
  const { modalOpen, editEntryId, deleteEntryId, closeModal } = useUIStore();
  const entries = useVaultStore((s) => s.entries);

  const editEntry = editEntryId
    ? (entries.find((e) => e.id === editEntryId) as ApiKeyEntry | undefined)
    : undefined;

  return (
    <div className="flex-1 overflow-y-auto">
      <EntryList type="apikey" />

      <Modal
        open={modalOpen === "add-apikey"}
        onClose={closeModal}
        title="新增 API 金鑰"
      >
        <ApiKeyForm onClose={closeModal} />
      </Modal>

      <Modal
        open={modalOpen === "edit" && editEntry?.type === "apikey"}
        onClose={closeModal}
        title="編輯 API 金鑰"
      >
        {editEntry && <ApiKeyForm editEntry={editEntry as ApiKeyEntry} onClose={closeModal} />}
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

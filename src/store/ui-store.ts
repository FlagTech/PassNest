import { create } from "zustand";
import type { FilterType, ModalType, SortDirection, SortField } from "../types/ui";

interface UIState {
  currentView: "passwords" | "apikeys";
  selectedEntryId: string | null;
  searchQuery: string;
  filterType: FilterType;
  sortField: SortField;
  sortDirection: SortDirection;
  modalOpen: ModalType;
  editEntryId: string | null;
  deleteEntryId: string | null;

  setView: (v: "passwords" | "apikeys") => void;
  selectEntry: (id: string | null) => void;
  setSearch: (q: string) => void;
  setFilter: (f: FilterType) => void;
  openModal: (m: ModalType, entryId?: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: "passwords",
  selectedEntryId: null,
  searchQuery: "",
  filterType: "all",
  sortField: "label",
  sortDirection: "asc",
  modalOpen: "none",
  editEntryId: null,
  deleteEntryId: null,

  setView: (v) => set({ currentView: v, selectedEntryId: null, searchQuery: "" }),
  selectEntry: (id) => set({ selectedEntryId: id }),
  setSearch: (q) => set({ searchQuery: q }),
  setFilter: (f) => set({ filterType: f }),
  openModal: (m, entryId) =>
    set({
      modalOpen: m,
      editEntryId: m === "edit" ? (entryId ?? null) : null,
      deleteEntryId: m === "delete" ? (entryId ?? null) : null,
    }),
  closeModal: () => set({ modalOpen: "none", editEntryId: null, deleteEntryId: null }),
}));

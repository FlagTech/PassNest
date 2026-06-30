export type EntryType = "password" | "apikey";

export interface BaseEntry {
  id: string;
  type: EntryType;
  label: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
}

export interface PasswordEntry extends BaseEntry {
  type: "password";
  url: string;
  username: string;
  password: string;
}

export interface ApiKeyEntry extends BaseEntry {
  type: "apikey";
  serviceName: string;
  keyValue: string;
  expiresAt: string | null;
}

export type VaultEntry = PasswordEntry | ApiKeyEntry;

export interface VaultPayload {
  schemaVersion: number;
  entries: VaultEntry[];
}

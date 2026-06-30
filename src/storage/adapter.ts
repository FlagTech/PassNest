export interface StorageAdapter {
  readVault(): Promise<string | null>;
  writeVault(data: string): Promise<void>;
  exportVault(): Promise<void>;
  importVault(file: File): Promise<void>;
  supportsNativePath: boolean;
}

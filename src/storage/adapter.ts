export interface StorageAdapter {
  readVault(): Promise<string | null>;
  writeVault(data: string): Promise<void>;
  supportsNativePath: boolean;
}

export interface KdfParams {
  algorithm: "argon2id";
  memoryCost: number;
  timeCost: number;
  parallelism: number;
  saltB64: string;
}

export interface EncryptedVault {
  version: number;
  passwordProtected: boolean;
  kdf: KdfParams;
  cipher: "aes-256-gcm";
  nonceB64: string;
  ciphertextB64: string;
}

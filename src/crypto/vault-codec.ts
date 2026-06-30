import { KDF_PARAMS, deriveKey, generateSalt } from "./argon2";
import { encrypt, decrypt } from "./aes";
import type { EncryptedVault, KdfParams } from "../types/crypto";
import type { VaultPayload } from "../types/vault";

// Used when password protection is disabled — never shown to users
export const NO_PASSWORD_SENTINEL = "__passnest_no_auth__";

export async function createNewVault(
  password?: string
): Promise<{ encrypted: EncryptedVault; key: Uint8Array; kdfParams: KdfParams }> {
  const pw = password ?? NO_PASSWORD_SENTINEL;
  const passwordProtected = !!password;
  const saltB64 = generateSalt();
  const kdfParams: KdfParams = { algorithm: "argon2id", ...KDF_PARAMS, saltB64 };
  const key = await deriveKey(pw, saltB64);
  const payload: VaultPayload = { schemaVersion: 1, entries: [] };
  const { nonceB64, ciphertextB64 } = await encrypt(key, JSON.stringify(payload));
  const encrypted: EncryptedVault = {
    version: 1,
    passwordProtected,
    kdf: kdfParams,
    cipher: "aes-256-gcm",
    nonceB64,
    ciphertextB64,
  };
  return { encrypted, key, kdfParams };
}

export async function unlockVault(
  password: string,
  encrypted: EncryptedVault
): Promise<{ payload: VaultPayload; key: Uint8Array }> {
  const key = await deriveKey(password, encrypted.kdf.saltB64);
  const json = await decrypt(key, encrypted.nonceB64, encrypted.ciphertextB64);
  const payload = JSON.parse(json) as VaultPayload;
  return { payload, key };
}

export async function saveVault(
  payload: VaultPayload,
  key: Uint8Array,
  kdfParams: KdfParams,
  passwordProtected: boolean
): Promise<EncryptedVault> {
  const { nonceB64, ciphertextB64 } = await encrypt(key, JSON.stringify(payload));
  return {
    version: 1,
    passwordProtected,
    kdf: kdfParams,
    cipher: "aes-256-gcm",
    nonceB64,
    ciphertextB64,
  };
}

import { gcm } from "@noble/ciphers/aes";
import { randomBytes } from "@noble/ciphers/webcrypto";
import { bytesToBase64url, base64urlToBytes } from "./utils";

export async function encrypt(
  key: Uint8Array,
  plaintext: string
): Promise<{ nonceB64: string; ciphertextB64: string }> {
  const nonce = randomBytes(12);
  const aes = gcm(key, nonce);
  const encrypted = aes.encrypt(new TextEncoder().encode(plaintext));
  return {
    nonceB64: bytesToBase64url(nonce),
    ciphertextB64: bytesToBase64url(encrypted),
  };
}

export async function decrypt(
  key: Uint8Array,
  nonceB64: string,
  ciphertextB64: string
): Promise<string> {
  const nonce = base64urlToBytes(nonceB64);
  const ciphertext = base64urlToBytes(ciphertextB64);
  const aes = gcm(key, nonce);
  const plaintext = aes.decrypt(ciphertext);
  return new TextDecoder().decode(plaintext);
}

import { argon2id } from "hash-wasm";
import { base64urlToBytes, bytesToBase64url } from "./utils";

export const KDF_PARAMS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export async function deriveKey(
  password: string,
  saltB64: string
): Promise<Uint8Array> {
  const salt = base64urlToBytes(saltB64);

  const hashHex = await argon2id({
    password,
    salt,
    parallelism: KDF_PARAMS.parallelism,
    iterations: KDF_PARAMS.timeCost,
    memorySize: KDF_PARAMS.memoryCost,
    hashLength: 32,
    outputType: "hex",
  });

  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hashHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function generateSalt(): string {
  return bytesToBase64url(crypto.getRandomValues(new Uint8Array(16)));
}

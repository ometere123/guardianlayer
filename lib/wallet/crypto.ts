import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ENCRYPTION_VERSION = "v2";
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SCRYPT_N = 16384;

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH, { N: SCRYPT_N, r: 8, p: 1 });
}

export function encryptPrivateKey(privateKey: string, userId: string): string {
  const secret = process.env.WALLET_ENCRYPTION_SECRET ?? "dev-secret-change-in-production";
  const salt = Buffer.from(userId.replace(/-/g, ""), "hex").subarray(0, 16);
  const key = deriveKey(secret, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const pkBytes = Buffer.from(privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey, "hex");
  const encrypted = Buffer.concat([cipher.update(pkBytes), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: v2:<iv_hex>:<authTag_hex>:<ciphertext_hex>
  return `${ENCRYPTION_VERSION}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptPrivateKey(encrypted: string, userId: string): string {
  const secret = process.env.WALLET_ENCRYPTION_SECRET ?? "dev-secret-change-in-production";
  const parts = encrypted.split(":");

  // Support legacy v1 format (XOR-based) for existing wallets
  if (parts[0] === "v1") {
    return decryptV1(parts[1], secret, userId);
  }

  const [, ivHex, authTagHex, ciphertextHex] = parts;
  const salt = Buffer.from(userId.replace(/-/g, ""), "hex").subarray(0, 16);
  const key = deriveKey(secret, salt);
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]);
  return `0x${decrypted.toString("hex")}`;
}

function decryptV1(hex: string, secret: string, userId: string): string {
  const combined = `${secret}:${userId}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const keyStr = Math.abs(hash).toString(16).padStart(8, "0");
  const keyBytes = Buffer.from(keyStr.repeat(8).slice(0, 32), "utf8");
  const encBytes = Buffer.from(hex, "hex");
  const decrypted = Buffer.alloc(encBytes.length);
  for (let i = 0; i < encBytes.length; i++) {
    decrypted[i] = encBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return `0x${decrypted.toString("hex")}`;
}

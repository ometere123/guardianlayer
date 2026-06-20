// Wallet encryption helpers — NOT a server action file
const ENCRYPTION_VERSION = "v1";

function deriveKey(secret: string, salt: string): string {
  const combined = `${secret}:${salt}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export function encryptPrivateKey(privateKey: string, userId: string): string {
  const secret = process.env.WALLET_ENCRYPTION_SECRET ?? "dev-secret-change-in-production";
  const key = deriveKey(secret, userId);
  const keyBytes = Buffer.from(key.repeat(8).slice(0, 32), "utf8");
  const pkBytes = Buffer.from(privateKey.slice(2), "hex");
  const encrypted = Buffer.alloc(pkBytes.length);
  for (let i = 0; i < pkBytes.length; i++) {
    encrypted[i] = pkBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return `${ENCRYPTION_VERSION}:${encrypted.toString("hex")}`;
}

export function decryptPrivateKey(encrypted: string, userId: string): string {
  const secret = process.env.WALLET_ENCRYPTION_SECRET ?? "dev-secret-change-in-production";
  const [, hex] = encrypted.split(":");
  const key = deriveKey(secret, userId);
  const keyBytes = Buffer.from(key.repeat(8).slice(0, 32), "utf8");
  const encBytes = Buffer.from(hex, "hex");
  const decrypted = Buffer.alloc(encBytes.length);
  for (let i = 0; i < encBytes.length; i++) {
    decrypted[i] = encBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return `0x${decrypted.toString("hex")}`;
}

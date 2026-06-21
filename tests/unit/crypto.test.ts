import { describe, it, expect } from "vitest";
import { encryptPrivateKey, decryptPrivateKey } from "@/lib/wallet/crypto";

const TEST_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TEST_USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

describe("wallet encryption v2 (AES-256-GCM)", () => {
  it("encrypts and decrypts correctly", () => {
    const encrypted = encryptPrivateKey(TEST_KEY, TEST_USER_ID);
    expect(encrypted.startsWith("v2:")).toBe(true);
    const decrypted = decryptPrivateKey(encrypted, TEST_USER_ID);
    expect(decrypted).toBe(TEST_KEY);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const e1 = encryptPrivateKey(TEST_KEY, TEST_USER_ID);
    const e2 = encryptPrivateKey(TEST_KEY, TEST_USER_ID);
    expect(e1).not.toBe(e2);
  });

  it("decryption fails with wrong userId", () => {
    const encrypted = encryptPrivateKey(TEST_KEY, TEST_USER_ID);
    expect(() => decryptPrivateKey(encrypted, "a0000000-0000-4000-8000-000000000001")).toThrow();
  });

  it("decryption fails with tampered ciphertext", () => {
    const encrypted = encryptPrivateKey(TEST_KEY, TEST_USER_ID);
    const parts = encrypted.split(":");
    parts[3] = "ff" + parts[3].slice(2);
    expect(() => decryptPrivateKey(parts.join(":"), TEST_USER_ID)).toThrow();
  });

  it("format is v2:iv:authTag:ciphertext", () => {
    const encrypted = encryptPrivateKey(TEST_KEY, TEST_USER_ID);
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("v2");
    expect(parts[1]).toHaveLength(32); // 16 bytes hex
    expect(parts[2]).toHaveLength(32); // 16 bytes hex
    expect(parts[3]).toHaveLength(64); // 32 bytes hex (private key)
  });
});

describe("v1 backward compatibility", () => {
  it("decrypts legacy v1 format", () => {
    // Encrypt with v1 logic manually
    const secret = process.env.WALLET_ENCRYPTION_SECRET ?? "dev-secret-change-in-production";
    const combined = `${secret}:${TEST_USER_ID}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const keyStr = Math.abs(hash).toString(16).padStart(8, "0");
    const keyBytes = Buffer.from(keyStr.repeat(8).slice(0, 32), "utf8");
    const pkBytes = Buffer.from(TEST_KEY.slice(2), "hex");
    const encrypted = Buffer.alloc(pkBytes.length);
    for (let i = 0; i < pkBytes.length; i++) {
      encrypted[i] = pkBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    const v1Encrypted = `v1:${encrypted.toString("hex")}`;

    const decrypted = decryptPrivateKey(v1Encrypted, TEST_USER_ID);
    expect(decrypted).toBe(TEST_KEY);
  });
});

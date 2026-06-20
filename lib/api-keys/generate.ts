import crypto from "crypto";

export type ApiKeyEnv = "live" | "test";

export type ApiKeyScopes =
  | "signals:write"
  | "protocols:read"
  | "incidents:read"
  | "guard:check";

export const ALL_SCOPES: ApiKeyScopes[] = [
  "signals:write",
  "protocols:read",
  "incidents:read",
  "guard:check",
];

const RANDOM_BYTES = 24;

/**
 * Generates a new API key. Returns the plaintext key (shown once) and its SHA-256 hash.
 * Format: gl_{env}_{base62-random}
 */
export function generateApiKey(env: ApiKeyEnv): {
  key: string;
  prefix: string;
  hash: string;
} {
  const pepper = process.env.API_KEY_PEPPER ?? "dev-pepper-change-in-production";
  const random = crypto.randomBytes(RANDOM_BYTES).toString("base64url");
  const key = `gl_${env}_${random}`;
  const prefix = key.slice(0, 12); // gl_live_xxxx or gl_test_xxx
  const hash = crypto
    .createHmac("sha256", pepper)
    .update(key)
    .digest("hex");
  return { key, prefix, hash };
}

/**
 * Hashes a raw API key for lookup. Same algorithm as generateApiKey.
 */
export function hashApiKey(key: string): string {
  const pepper = process.env.API_KEY_PEPPER ?? "dev-pepper-change-in-production";
  return crypto.createHmac("sha256", pepper).update(key).digest("hex");
}

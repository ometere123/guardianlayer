import { createServiceClient } from "@/lib/supabase/server";
import { hashApiKey, type ApiKeyScopes } from "./generate";

export type AuthenticatedKey = {
  api_key_id: string;
  organisation_id: string;
  scopes: string[];
};

type AuthResult =
  | { ok: true; key: AuthenticatedKey }
  | { ok: false; status: 401 | 403; message: string };

/**
 * Authenticates a Bearer token from the Authorization header.
 * Validates key hash, active status, and required scope.
 */
export async function authenticateApiKey(
  authHeader: string | null,
  requiredScope: ApiKeyScopes
): Promise<AuthResult> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, message: "Missing Bearer token" };
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith("gl_")) {
    return { ok: false, status: 401, message: "Invalid key format" };
  }

  const hash = hashApiKey(rawKey);
  const service = await createServiceClient();

  const { data: apiKey } = await service
    .from("api_keys")
    .select("id, organisation_id, scopes, status")
    .eq("key_hash", hash)
    .eq("status", "active")
    .maybeSingle();

  if (!apiKey) {
    return { ok: false, status: 401, message: "Invalid or revoked API key" };
  }

  const scopes: string[] = Array.isArray(apiKey.scopes) ? apiKey.scopes : [];
  if (!scopes.includes(requiredScope)) {
    return {
      ok: false,
      status: 403,
      message: `Scope '${requiredScope}' not granted for this key`,
    };
  }

  // Update last_used_at (fire-and-forget)
  service
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {});

  return {
    ok: true,
    key: {
      api_key_id: apiKey.id,
      organisation_id: apiKey.organisation_id,
      scopes,
    },
  };
}

/**
 * Writes an API key usage log entry.
 */
export async function logApiKeyUse(
  apiKeyId: string,
  organisationId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  ipAddressHash?: string
) {
  const service = await createServiceClient();
  await service.from("api_key_logs").insert({
    api_key_id: apiKeyId,
    organisation_id: organisationId,
    endpoint,
    method,
    status_code: statusCode,
    ip_address_hash: ipAddressHash ?? null,
  });
}

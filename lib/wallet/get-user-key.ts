import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptPrivateKey } from "./crypto";

/**
 * Fetches and decrypts the acting user's embedded wallet private key.
 * Throws if no wallet exists — user must complete onboarding first.
 */
export async function getUserPrivateKey(
  service: SupabaseClient,
  userId: string
): Promise<`0x${string}`> {
  const { data, error } = await service
    .from("wallets")
    .select("encrypted_private_key")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();

  if (error || !data?.encrypted_private_key) {
    throw new Error("No wallet found for user — complete onboarding first");
  }

  return decryptPrivateKey(data.encrypted_private_key, userId) as `0x${string}`;
}

import { ethers } from "ethers";
import { createServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/write";
import { encryptPrivateKey } from "./crypto";

const ENCRYPTION_VERSION = "v1";

export async function getOrCreateWallet(userId: string, orgId: string): Promise<{
  wallet_address: string;
  created: boolean;
  recovery_hint: string | null;
}> {
  const service = await createServiceClient();

  // Check for existing wallet — never generate twice
  const { data: existing } = await service
    .from("wallets")
    .select("wallet_address, recovery_hint")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();

  if (existing) {
    return { wallet_address: existing.wallet_address, created: false, recovery_hint: null };
  }

  // Generate new wallet
  const wallet = ethers.Wallet.createRandom();
  const address = wallet.address.toLowerCase();
  const privateKey = wallet.privateKey;

  const encryptedKey = encryptPrivateKey(privateKey, userId);
  const recoveryHint = `gl-recovery-${address.slice(2, 8)}-${Date.now().toString(36)}`;

  const { error } = await service.from("wallets").insert({
    user_id: userId,
    organisation_id: orgId,
    wallet_address: address,
    encrypted_private_key: encryptedKey,
    encryption_version: ENCRYPTION_VERSION,
    recovery_hint: recoveryHint,
    is_primary: true,
  });

  if (error) throw new Error(`Wallet creation failed: ${error.message}`);

  // Update org owner wallet address
  await service
    .from("organisations")
    .update({ owner_wallet_address: address })
    .eq("id", orgId);

  await writeAuditLog(service, {
    organisation_id: orgId,
    actor_user_id: userId,
    action: "wallet.created",
    target_type: "wallet",
    metadata_json: { wallet_address: address, encryption_version: ENCRYPTION_VERSION },
  });

  return { wallet_address: address, created: true, recovery_hint: recoveryHint };
}

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { glRegisterProtocol, getExplorerTxUrl } from "@/lib/genlayer/client";
import { writeAuditLog } from "@/lib/audit/write";
import { getUserPrivateKey } from "@/lib/wallet/get-user-key";
import { createAccount } from "genlayer-js";
import crypto from "crypto";

// POST /api/genlayer/register
// Registers a protocol on the GuardianLayer GenLayer contract.
// Body: { protocol_id: string }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await createServiceClient();

  const membershipResult = await service
    .from("organisation_members")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const membership = membershipResult.data as { organisation_id: string; role: string } | null;
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as { protocol_id?: string };
  const { protocol_id } = body;
  if (!protocol_id) return NextResponse.json({ error: "protocol_id required" }, { status: 400 });

  const { data: rawProtocol } = await service
    .from("protocols")
    .select("id, protocol_key, name, description, category, chain, network, emergency_mode, owner_wallet_address, genlayer_protocol_registered")
    .eq("id", protocol_id)
    .eq("organisation_id", membership.organisation_id)
    .maybeSingle();

  if (!rawProtocol) return NextResponse.json({ error: "Protocol not found" }, { status: 404 });
  const protocol = rawProtocol as Record<string, unknown>;

  if (protocol.genlayer_protocol_registered) {
    return NextResponse.json({ error: "Protocol already registered on GenLayer" }, { status: 409 });
  }

  const { data: rawPolicy } = await service
    .from("pause_policies")
    .select("policy_hash, emergency_mode, minimum_threat_for_soft_pause, minimum_threat_for_hard_pause, hard_pause_enabled, human_approval_required_for_hard_pause")
    .eq("protocol_id", protocol_id)
    .maybeSingle();
  const policy = rawPolicy as Record<string, unknown> | null;

  const publicSummary = [
    `name=${protocol.name as string}`,
    `category=${protocol.category as string}`,
    `chain=${protocol.chain as string}/${protocol.network as string}`,
    `description=${(protocol.description as string | null) ?? ""}`,
  ].join("; ");

  const organisationHash = sha256(membership.organisation_id);
  const profileHash = sha256(`${user.id}:${protocol.owner_wallet_address ?? ""}`);
  const policyHash = (policy?.policy_hash as string | null) ?? sha256(JSON.stringify(policy ?? {
    emergency_mode: protocol.emergency_mode,
  }));

  let privateKey: `0x${string}`;
  try {
    privateKey = await getUserPrivateKey(service, user.id);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  let txHash: string;
  try {
    const result = await glRegisterProtocol(privateKey, {
      protocol_key: protocol.protocol_key as string,
      organisation_hash: organisationHash,
      profile_hash: profileHash,
      policy_hash: policyHash,
      public_protocol_summary: publicSummary,
      emergency_mode: (policy?.emergency_mode as string | undefined) ?? (protocol.emergency_mode as string),
      owner_wallet: (protocol.owner_wallet_address as string | null) || createAccount(privateKey).address,
    });
    txHash = result.hash;
  } catch (err) {
    console.error("[genlayer/register] Contract write failed:", err);
    return NextResponse.json({ error: "GenLayer transaction failed", detail: String(err) }, { status: 502 });
  }

  const explorerUrl = getExplorerTxUrl(txHash);

  await service
    .from("protocols")
    .update({
      genlayer_protocol_registered: true,
      genlayer_registration_tx_hash: txHash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", protocol_id);

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "protocol.genlayer_registered",
    target_type: "protocol",
    target_id: protocol_id,
    metadata_json: { tx_hash: txHash, explorer_url: explorerUrl, protocol_key: protocol.protocol_key as string },
  });

  return NextResponse.json({ ok: true, tx_hash: txHash, explorer_url: explorerUrl });
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

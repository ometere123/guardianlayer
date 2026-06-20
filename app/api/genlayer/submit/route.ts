import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { glSubmitIncident, getExplorerTxUrl } from "@/lib/genlayer/client";
import { writeAuditLog } from "@/lib/audit/write";
import { getUserPrivateKey } from "@/lib/wallet/get-user-key";
import crypto from "crypto";

// POST /api/genlayer/submit
// Submits an incident to the GuardianLayer GenLayer contract.
// Body: { incident_id: string }
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
  if (!membership || !["owner", "admin", "security_analyst"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as { incident_id?: string };
  const { incident_id } = body;
  if (!incident_id) return NextResponse.json({ error: "incident_id required" }, { status: 400 });

  // Load incident + protocol
  const { data: rawIncident } = await service
    .from("incidents")
    .select("id, incident_key, title, summary, threat_level, source_count, evidence_hash, genlayer_tx_hash, protocol_id")
    .eq("id", incident_id)
    .eq("organisation_id", membership.organisation_id)
    .maybeSingle();

  if (!rawIncident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  const incident = rawIncident as Record<string, unknown>;

  if (incident.genlayer_tx_hash) {
    return NextResponse.json({ error: "Incident already submitted to GenLayer" }, { status: 409 });
  }

  const evidenceHash = (incident.evidence_hash as string | null) ?? "";
  if (!evidenceHash) {
    return NextResponse.json({ error: "No evidence packet found — escalate signal first" }, { status: 400 });
  }

  const { data: rawProtocol } = await service
    .from("protocols")
    .select("protocol_key, genlayer_protocol_registered")
    .eq("id", incident.protocol_id as string)
    .maybeSingle();
  const protocol = rawProtocol as Record<string, unknown> | null;

  if (!protocol?.genlayer_protocol_registered) {
    return NextResponse.json({ error: "Protocol must be registered on GenLayer first" }, { status: 400 });
  }

  const { data: links } = await service
    .from("incident_signals")
    .select("signal_id")
    .eq("incident_id", incident_id);
  const signalIds = (links ?? []).map(link => (link as { signal_id: string }).signal_id);
  const { data: signals } = signalIds.length
    ? await service
      .from("signals")
      .select("id, signal_type, title, summary, tx_hashes, affected_contracts, evidence_urls")
      .in("id", signalIds)
    : { data: [] };
  const primarySignal = ((signals ?? [])[0] ?? {}) as Record<string, unknown>;
  const txHashes = flattenStringArrays(signals ?? [], "tx_hashes");
  const affectedContracts = flattenStringArrays(signals ?? [], "affected_contracts");
  const evidenceUrls = flattenStringArrays(signals ?? [], "evidence_urls");
  const signalType = normaliseSignalType(primarySignal.signal_type as string | undefined);

  let privateKey: `0x${string}`;
  try {
    privateKey = await getUserPrivateKey(service, user.id);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  let txHash: string;
  try {
    const result = await glSubmitIncident(privateKey, {
      protocol_key: protocol.protocol_key as string,
      incident_key: incident.incident_key as string,
      signal_type: signalType,
      evidence_hash: evidenceHash,
      evidence_summary_hash: sha256(incident.summary as string),
      evidence_refs_hash: sha256(JSON.stringify({ evidence_urls: evidenceUrls.sort(), tx_hashes: txHashes.sort() })),
      affected_contracts_hash: sha256(JSON.stringify(affectedContracts.sort())),
      public_incident_summary: incident.summary as string,
      severity_hint: incident.threat_level as string,
      source_count: incident.source_count as number,
    });
    txHash = result.hash;
  } catch (err) {
    console.error("[genlayer/submit] Contract write failed:", err);
    return NextResponse.json({ error: "GenLayer transaction failed", detail: String(err) }, { status: 502 });
  }

  const explorerUrl = getExplorerTxUrl(txHash);
  const contractAddress = process.env.NEXT_PUBLIC_GUARDIAN_LAYER_CONTRACT_ADDRESS!;
  const now = new Date().toISOString();

  // Create a genlayer_decisions row in "pending" state
  const { data: decision } = await service
    .from("genlayer_decisions")
    .insert({
      organisation_id: membership.organisation_id,
      protocol_id: incident.protocol_id as string,
      incident_id: incident_id,
      contract_address: contractAddress,
      tx_hash: txHash,
      evidence_hash: evidenceHash,
      consensus_status: "pending",
      source_of_truth: "genlayer",
      explorer_url: explorerUrl,
      submitted_at: now,
    })
    .select("id")
    .single();

  // Update incident with tx hash and decision id
  await service
    .from("incidents")
    .update({
      genlayer_tx_hash: txHash,
      genlayer_decision_id: decision?.id ?? null,
      status: "genlayer_pending",
      updated_at: now,
    })
    .eq("id", incident_id);

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "incident.genlayer_submitted",
    target_type: "incident",
    target_id: incident_id,
    metadata_json: { tx_hash: txHash, explorer_url: explorerUrl, decision_id: decision?.id },
  });

  return NextResponse.json({
    ok: true,
    tx_hash: txHash,
    explorer_url: explorerUrl,
    decision_id: decision?.id ?? null,
  });
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function flattenStringArrays(rows: unknown[], key: string) {
  return rows.flatMap(row => {
    const value = (row as Record<string, unknown>)[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  });
}

function normaliseSignalType(value: string | undefined) {
  const allowed = new Set([
    "large_outflow",
    "abnormal_withdrawal",
    "admin_wallet_change",
    "ownership_transfer",
    "pause_state_change",
    "contract_upgrade",
    "suspicious_approval",
    "bridge_drain_pattern",
    "security_report",
    "public_exploit_claim",
    "github_advisory",
    "api_submitted",
    "manual_report",
    "integration_compromise",
    "unknown",
  ]);
  return value && allowed.has(value) ? value : "api_submitted";
}

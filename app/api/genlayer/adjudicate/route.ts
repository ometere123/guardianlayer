import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { glAdjudicateIncident, getExplorerTxUrl } from "@/lib/genlayer/client";
import { writeAuditLog } from "@/lib/audit/write";
import { getUserPrivateKey } from "@/lib/wallet/get-user-key";

// POST /api/genlayer/adjudicate
// Requests AI consensus adjudication for an incident.
// Waits for FINALIZED status (this is a long-running call — up to ~7 min).
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

  const { data: rawIncident } = await service
    .from("incidents")
    .select("id, incident_key, title, summary, threat_level, source_count, genlayer_tx_hash, genlayer_decision_id, protocol_id, status")
    .eq("id", incident_id)
    .eq("organisation_id", membership.organisation_id)
    .maybeSingle();

  if (!rawIncident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  const incident = rawIncident as Record<string, unknown>;

  if (!incident.genlayer_tx_hash) {
    return NextResponse.json({ error: "Incident must be submitted to GenLayer first" }, { status: 400 });
  }

  const { data: rawProtocol } = await service
    .from("protocols")
    .select("id, protocol_key, name, description, category, chain, network, emergency_mode")
    .eq("id", incident.protocol_id as string)
    .maybeSingle();
  const protocol = rawProtocol as Record<string, unknown> | null;

  const { data: policy } = await service
    .from("pause_policies")
    .select("emergency_mode, minimum_threat_for_soft_pause, minimum_threat_for_hard_pause, hard_pause_enabled, human_approval_required_for_hard_pause, requires_explorer_evidence, requires_multiple_sources_for_hard_pause")
    .eq("protocol_id", incident.protocol_id as string)
    .maybeSingle();

  const { data: contracts } = await service
    .from("monitored_contracts")
    .select("name, address, role, is_pause_capable, pause_function_name, is_active")
    .eq("protocol_id", incident.protocol_id as string);

  const { data: links } = await service
    .from("incident_signals")
    .select("signal_id")
    .eq("incident_id", incident_id);
  const signalIds = (links ?? []).map(link => (link as { signal_id: string }).signal_id);
  const { data: signals } = signalIds.length
    ? await service
      .from("signals")
      .select("id, signal_type, severity_hint, title, summary, tx_hashes, affected_contracts, evidence_urls")
      .in("id", signalIds)
    : { data: [] };

  const signalRows = (signals ?? []) as Record<string, unknown>[];
  const protocolSummary = protocol
    ? `${protocol.name as string} (${protocol.category as string}, ${protocol.chain as string}/${protocol.network as string}). ${(protocol.description as string | null) ?? ""}`
    : "";
  const pausePolicySummary = JSON.stringify(policy ?? {});
  const affectedContractsSummary = JSON.stringify(contracts ?? []);
  const evidenceUrlsJson = JSON.stringify(flattenStringArrays(signalRows, "evidence_urls"));
  const txHashesJson = JSON.stringify(flattenStringArrays(signalRows, "tx_hashes"));
  const apiSignalSummary = signalRows.map(signal => ({
    signal_type: signal.signal_type,
    severity_hint: signal.severity_hint,
    title: signal.title,
    summary: signal.summary,
  }));

  let privateKey: `0x${string}`;
  try {
    privateKey = await getUserPrivateKey(service, user.id);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  let adjHash: string;
  let adjudicated = false;
  try {
    const result = await glAdjudicateIncident(privateKey, {
      incident_key: incident.incident_key as string,
      protocol_summary: protocolSummary,
      pause_policy_summary: pausePolicySummary,
      affected_contracts_summary: affectedContractsSummary,
      known_wallet_context: "[]",
      evidence_urls_json: evidenceUrlsJson,
      tx_hashes_json: txHashesJson,
      public_reports_json: "[]",
      api_signal_summary: JSON.stringify(apiSignalSummary),
      manual_triage_summary: `${incident.title as string}: ${incident.summary as string}`,
    });
    adjHash = result.hash;
    adjudicated = result.adjudicated;
  } catch (err) {
    console.error("[genlayer/adjudicate] Contract write failed:", err);
    return NextResponse.json({ error: "GenLayer adjudication failed", detail: String(err) }, { status: 502 });
  }

  const explorerUrl = getExplorerTxUrl(adjHash);
  const now = new Date().toISOString();

  // Update the decision row to mark adjudication tx
  if (incident.genlayer_decision_id) {
    await service
      .from("genlayer_decisions")
      .update({ consensus_status: adjudicated ? "adjudicated" : "adjudicating", explorer_url: explorerUrl })
      .eq("id", incident.genlayer_decision_id as string);
  }

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "incident.genlayer_adjudicated",
    target_type: "incident",
    target_id: incident_id,
    metadata_json: { adjudication_tx_hash: adjHash, explorer_url: explorerUrl },
  });

  return NextResponse.json({
    ok: true,
    adjudication_tx_hash: adjHash,
    explorer_url: explorerUrl,
    finalized: adjudicated,
    message: adjudicated
      ? "Adjudication finalized. Call /api/genlayer/sync to mirror the decision to Supabase."
      : "Adjudication transaction submitted, but the contract has not exposed a finalized verdict yet. Retry sync after the validator decision is available.",
    now,
  }, { status: adjudicated ? 200 : 202 });
}

function flattenStringArrays(rows: Record<string, unknown>[], key: string) {
  return rows.flatMap(row => {
    const value = row[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  });
}

"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/write";
import { buildEvidencePacket } from "@/lib/evidence/build";
import { deliverWebhookEvent } from "@/lib/webhooks/deliver";
import { generateKey } from "@/lib/utils";
import crypto from "crypto";

export async function submitSignal(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = await createServiceClient();

  const membershipResult = await service
    .from("organisation_members")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const membership = membershipResult.data as { organisation_id: string; role: string } | null;
  if (!membership?.organisation_id) redirect("/onboarding");
  if (!["owner", "admin", "security_analyst"].includes(membership.role)) redirect("/app/signals");

  const protocol_id = formData.get("protocol_id") as string;
  const signal_type = formData.get("signal_type") as string;
  const severity_hint = (formData.get("severity_hint") as string) || "medium";
  const title = (formData.get("title") as string)?.trim();
  const summary = (formData.get("summary") as string)?.trim();
  const tx_hashes_raw = (formData.get("tx_hashes") as string)?.trim();
  const affected_contracts_raw = (formData.get("affected_contracts") as string)?.trim();
  const evidence_urls_raw = (formData.get("evidence_urls") as string)?.trim();

  if (!protocol_id || !signal_type || !title || !summary) return;

  const tx_hashes = tx_hashes_raw ? tx_hashes_raw.split("\n").map(s => s.trim()).filter(Boolean) : [];
  const affected_contracts = affected_contracts_raw ? affected_contracts_raw.split("\n").map(s => s.trim().toLowerCase()).filter(Boolean) : [];
  const evidence_urls = evidence_urls_raw ? evidence_urls_raw.split("\n").map(s => s.trim()).filter(Boolean) : [];

  // Canonical hash for deduplication
  const canonical = JSON.stringify({ protocol_id, signal_type, title, summary });
  const source_hash = crypto.createHash("sha256").update(canonical).digest("hex");

  const { data: signal, error } = await service
    .from("signals")
    .insert({
      organisation_id: membership.organisation_id,
      protocol_id,
      source_type: "dashboard",
      signal_type,
      severity_hint,
      title,
      summary,
      tx_hashes,
      affected_contracts,
      evidence_urls,
      source_hash,
      submitted_by_user_id: user.id,
      status: "new",
    })
    .select("id")
    .single();

  if (error || !signal) return;

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "signal.submitted",
    target_type: "signal",
    target_id: signal.id,
    metadata_json: { protocol_id, signal_type, severity_hint, title },
  });

  redirect(`/app/signals/${signal.id}`);
}

export async function escalateToIncident(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = await createServiceClient();

  const membershipResult = await service
    .from("organisation_members")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const membership = membershipResult.data as { organisation_id: string; role: string } | null;
  if (!membership || !["owner", "admin", "security_analyst"].includes(membership.role)) return;

  const signal_id = formData.get("signal_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const summary = (formData.get("summary") as string)?.trim();
  const threat_level = (formData.get("threat_level") as string) || "elevated";

  if (!signal_id || !title || !summary) return;

  // Load signal
  const { data: rawSignal } = await service
    .from("signals")
    .select("id, protocol_id, tx_hashes, affected_contracts, evidence_urls, source_hash")
    .eq("id", signal_id)
    .eq("organisation_id", membership.organisation_id)
    .maybeSingle();

  if (!rawSignal) return;
  const signal = rawSignal as Record<string, unknown>;

  const incident_key = generateKey("inc-");
  const submittedAt = new Date().toISOString();

  // Build evidence packet (Stage 7)
  const { evidence_hash } = buildEvidencePacket({
    protocol_id: signal.protocol_id as string,
    incident_id: "pending", // will be updated after insert
    incident_key,
    title,
    summary,
    threat_level,
    signal_ids: [signal_id],
    tx_hashes: (signal.tx_hashes as string[]) ?? [],
    affected_contracts: (signal.affected_contracts as string[]) ?? [],
    affected_wallets: [],
    evidence_urls: (signal.evidence_urls as string[]) ?? [],
    source_count: 1,
    submitted_by: user.id,
    submitted_at: submittedAt,
  });

  // Create incident
  const { data: rawIncident, error: incidentError } = await service
    .from("incidents")
    .insert({
      organisation_id: membership.organisation_id,
      protocol_id: signal.protocol_id as string,
      incident_key,
      title,
      summary,
      status: "open",
      threat_level,
      recommended_action: "observe",
      confidence_label: "low",
      support_level: "single_source",
      source_count: 1,
      evidence_hash,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (incidentError || !rawIncident) return;
  const incident = rawIncident as { id: string };

  // Rebuild packet with real incident_id and store it
  const finalPacket = buildEvidencePacket({
    protocol_id: signal.protocol_id as string,
    incident_id: incident.id,
    incident_key,
    title,
    summary,
    threat_level,
    signal_ids: [signal_id],
    tx_hashes: (signal.tx_hashes as string[]) ?? [],
    affected_contracts: (signal.affected_contracts as string[]) ?? [],
    affected_wallets: [],
    evidence_urls: (signal.evidence_urls as string[]) ?? [],
    source_count: 1,
    submitted_by: user.id,
    submitted_at: submittedAt,
  });

  // Store evidence packet
  await service.from("evidence_packets").insert({
    organisation_id: membership.organisation_id,
    protocol_id: signal.protocol_id as string,
    incident_id: incident.id,
    packet_json: finalPacket.packet_json,
    canonical_payload: finalPacket.canonical_payload,
    evidence_hash: finalPacket.evidence_hash,
    created_by: user.id,
  });

  // Link signal → incident
  await service.from("incident_signals").insert({
    incident_id: incident.id,
    signal_id,
  });

  // Mark signal as escalated
  await service.from("signals").update({ status: "incident_created" }).eq("id", signal_id);

  // Update protocol threat level
  await service
    .from("protocols")
    .update({
      current_threat_level: threat_level,
      current_status: "under_review",
      last_signal_at: submittedAt,
      updated_at: submittedAt,
    })
    .eq("id", signal.protocol_id as string)
    .eq("organisation_id", membership.organisation_id);

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "incident.created",
    target_type: "incident",
    target_id: incident.id,
    metadata_json: {
      from_signal_id: signal_id,
      threat_level,
      evidence_hash: finalPacket.evidence_hash,
      incident_key,
    },
  });

  await deliverWebhookEvent(service, membership.organisation_id, "incident.created", {
    incident_id: incident.id,
    incident_key,
    title,
    threat_level,
    evidence_hash: finalPacket.evidence_hash,
    from_signal_id: signal_id,
  });

  redirect(`/app/incidents/${incident.id}`);
}

export async function updateIncidentStatus(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = await createServiceClient();

  const membershipResult = await service
    .from("organisation_members")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const membership = membershipResult.data as { organisation_id: string; role: string } | null;
  if (!membership || !["owner", "admin", "security_analyst"].includes(membership.role)) return;

  const incident_id = formData.get("incident_id") as string;
  const new_status = formData.get("status") as string;

  const allowedStatuses = ["open", "under_review", "genlayer_pending", "resolved", "dismissed"];
  if (!incident_id || !allowedStatuses.includes(new_status)) return;

  const update = {
    status: new_status,
    updated_at: new Date().toISOString(),
    ...(new_status === "resolved" || new_status === "dismissed"
      ? { resolved_at: new Date().toISOString() }
      : {}),
  };

  await service
    .from("incidents")
    .update(update)
    .eq("id", incident_id)
    .eq("organisation_id", membership.organisation_id);

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "incident.status_changed",
    target_type: "incident",
    target_id: incident_id,
    metadata_json: { new_status },
  });

  redirect(`/app/incidents/${incident_id}?updated=1`);
}

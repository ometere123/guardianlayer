import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { glGetIncident } from "@/lib/genlayer/client";
import { writeAuditLog } from "@/lib/audit/write";
import { deliverWebhookEvent } from "@/lib/webhooks/deliver";

// POST /api/genlayer/sync
// Reads the adjudicated decision from the GenLayer contract and mirrors it to Supabase.
// GenLayer is the authoritative source of truth — Supabase never overrides the verdict.
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
    .select("id, incident_key, genlayer_decision_id, protocol_id, title, threat_level")
    .eq("id", incident_id)
    .eq("organisation_id", membership.organisation_id)
    .maybeSingle();

  if (!rawIncident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  const incident = rawIncident as Record<string, unknown>;

  if (!incident.genlayer_decision_id) {
    return NextResponse.json({ error: "No GenLayer decision linked — submit and adjudicate first" }, { status: 400 });
  }

  // Read from contract — GenLayer is source of truth
  let verdict;
  try {
    verdict = await glGetIncident(incident.incident_key as string);
  } catch (err) {
    console.error("[genlayer/sync] Contract read failed:", err);
    return NextResponse.json({ error: "Failed to read from GenLayer contract", detail: String(err) }, { status: 502 });
  }

  if (!verdict.adjudicated) {
    return NextResponse.json({
      ok: false,
      message: "Contract has not finalized adjudication yet. Retry after adjudicate call completes.",
      verdict,
    });
  }

  const now = new Date().toISOString();

  // Mirror decision to genlayer_decisions row
  await service
    .from("genlayer_decisions")
    .update({
      consensus_status: "finalized",
      threat_level: verdict.verdict_threat_level,
      recommended_action: verdict.verdict_recommended_action,
      confidence_label: verdict.verdict_confidence_label,
      support_level: verdict.verdict_support_level,
      reasoning_summary: verdict.verdict_reasoning,
      raw_decision_json: verdict as unknown as import("@/lib/supabase/types").Json,
      source_of_truth: "genlayer",
      finalized_at: now,
    })
    .eq("id", incident.genlayer_decision_id as string);

  // Mirror threat level to incident — GenLayer verdict wins
  await service
    .from("incidents")
    .update({
      threat_level: verdict.verdict_threat_level ?? (incident.threat_level as string),
      recommended_action: verdict.verdict_recommended_action ?? "observe",
      confidence_label: verdict.verdict_confidence_label ?? "medium",
      support_level: verdict.verdict_support_level ?? "multi_source",
      status: "resolved",
      updated_at: now,
    })
    .eq("id", incident_id);

  // Propagate threat level to protocol if needed
  const THREAT_ORDER = ["none", "low", "elevated", "high", "critical"];
  const { data: rawProtocol } = await service
    .from("protocols")
    .select("current_threat_level, current_recommended_action")
    .eq("id", incident.protocol_id as string)
    .maybeSingle();

  if (rawProtocol) {
    const p = rawProtocol as Record<string, unknown>;
    const current = THREAT_ORDER.indexOf(p.current_threat_level as string);
    const incoming = THREAT_ORDER.indexOf(verdict.verdict_threat_level ?? "none");

    if (incoming > current) {
      await service
        .from("protocols")
        .update({
          current_threat_level: verdict.verdict_threat_level ?? undefined,
          current_recommended_action: verdict.verdict_recommended_action ?? "observe",
          last_genlayer_decision_at: now,
          updated_at: now,
        })
        .eq("id", incident.protocol_id as string);
    } else {
      await service
        .from("protocols")
        .update({ last_genlayer_decision_at: now, updated_at: now })
        .eq("id", incident.protocol_id as string);
    }
  }

  // Auto-pause: if verdict is critical and policy allows, trigger pause
  let autoPauseTriggered = false;
  if (verdict.verdict_threat_level === "critical" || verdict.verdict_recommended_action === "emergency_pause") {
    const { data: policyRow } = await service
      .from("pause_policies")
      .select("emergency_mode, hard_pause_enabled, human_approval_required_for_hard_pause")
      .eq("protocol_id", incident.protocol_id as string)
      .maybeSingle();
    const pol = policyRow as Record<string, unknown> | null;

    const canAutoPause = pol && (
      (pol.emergency_mode === "hard_pause") ||
      (pol.emergency_mode === "soft_pause" && !pol.human_approval_required_for_hard_pause)
    );

    if (canAutoPause) {
      await service
        .from("protocols")
        .update({ current_status: "paused", updated_at: now })
        .eq("id", incident.protocol_id as string);

      await writeAuditLog(service, {
        organisation_id: membership.organisation_id,
        actor_user_id: user.id,
        action: "protocol.auto_paused",
        target_type: "protocol",
        target_id: incident.protocol_id as string,
        metadata_json: {
          trigger: "genlayer_critical_verdict",
          incident_id,
          threat_level: verdict.verdict_threat_level,
        },
      });

      autoPauseTriggered = true;
    }
  }

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "incident.genlayer_synced",
    target_type: "incident",
    target_id: incident_id,
    metadata_json: {
      threat_level: verdict.verdict_threat_level,
      recommended_action: verdict.verdict_recommended_action,
      confidence_label: verdict.verdict_confidence_label,
      source_of_truth: "genlayer",
    },
  });

  // Fire webhook
  await deliverWebhookEvent(service, membership.organisation_id, "incident.adjudicated", {
    incident_id,
    incident_key: incident.incident_key,
    title: incident.title,
    threat_level: verdict.verdict_threat_level,
    recommended_action: verdict.verdict_recommended_action,
    confidence_label: verdict.verdict_confidence_label,
    source_of_truth: "genlayer",
  });

  return NextResponse.json({
    ok: true,
    synced: true,
    auto_pause_triggered: autoPauseTriggered,
    verdict: {
      threat_level: verdict.verdict_threat_level,
      recommended_action: verdict.verdict_recommended_action,
      confidence_label: verdict.verdict_confidence_label,
      support_level: verdict.verdict_support_level,
      reasoning: verdict.verdict_reasoning,
    },
  });
}

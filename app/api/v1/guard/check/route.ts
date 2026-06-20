import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiKeyUse } from "@/lib/api-keys/authenticate";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/v1/guard/check?protocol_id=<uuid>
// Returns a boolean guard decision for automated circuit-breaker integration.
// Required scope: guard:check
//
// Response shape:
//   { should_pause: boolean, threat_level: string, recommended_action: string,
//     source_of_truth: "genlayer" | "guardian", genlayer_decision_id?: string }
//
// IMPORTANT: should_pause is advisory — GenLayer is the authoritative source.
// Callers MUST display source_of_truth to operators and must not act without human review
// unless emergency_mode === "automatic" AND source_of_truth === "genlayer".
export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(
    request.headers.get("authorization"),
    "guard:check"
  );

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { api_key_id, organisation_id } = auth.key;
  const { searchParams } = new URL(request.url);
  const protocolId = searchParams.get("protocol_id");

  if (!protocolId) {
    return NextResponse.json({ error: "protocol_id query param required" }, { status: 400 });
  }

  const service = await createServiceClient();

  const { data: protocol } = await service
    .from("protocols")
    .select(
      "id, current_status, current_threat_level, current_recommended_action, emergency_mode"
    )
    .eq("id", protocolId)
    .eq("organisation_id", organisation_id)
    .maybeSingle();

  if (!protocol) {
    await logApiKeyUse(api_key_id, organisation_id, "/api/v1/guard/check", "GET", 404);
    return NextResponse.json({ error: "Protocol not found" }, { status: 404 });
  }

  // Look up latest finalized GenLayer decision for this protocol
  const { data: latestDecision } = await service
    .from("genlayer_decisions")
    .select("id, threat_level, recommended_action, consensus_status, source_of_truth")
    .eq("protocol_id", protocolId)
    .eq("organisation_id", organisation_id)
    .eq("consensus_status", "finalized")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const shouldPause =
    protocol.current_status === "paused" ||
    protocol.current_status === "pause_recommended" ||
    protocol.current_recommended_action === "pause_recommended";

  const sourceOfTruth = latestDecision ? "genlayer" : "guardian";

  await logApiKeyUse(api_key_id, organisation_id, "/api/v1/guard/check", "GET", 200);

  return NextResponse.json({
    protocol_id: protocolId,
    should_pause: shouldPause,
    threat_level: protocol.current_threat_level,
    recommended_action: protocol.current_recommended_action,
    emergency_mode: protocol.emergency_mode,
    source_of_truth: sourceOfTruth,
    genlayer_decision_id: latestDecision?.id ?? null,
    warning:
      sourceOfTruth === "guardian"
        ? "No finalized GenLayer consensus yet — this is a Guardian pre-consensus estimate only"
        : undefined,
  });
}

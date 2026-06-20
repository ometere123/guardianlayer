import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiKeyUse } from "@/lib/api-keys/authenticate";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/v1/incidents/:id
// Returns incident detail including latest GenLayer decision.
// Required scope: incidents:read
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await authenticateApiKey(
    request.headers.get("authorization"),
    "incidents:read"
  );

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { api_key_id, organisation_id } = auth.key;
  const service = await createServiceClient();

  const { data: incident } = await service
    .from("incidents")
    .select(
      "id, incident_key, title, summary, status, threat_level, recommended_action, confidence_label, support_level, evidence_hash, genlayer_decision_id, genlayer_tx_hash, pause_execution_status, created_at, updated_at, resolved_at"
    )
    .eq("id", id)
    .eq("organisation_id", organisation_id)
    .maybeSingle();

  await logApiKeyUse(
    api_key_id,
    organisation_id,
    `/api/v1/incidents/${id}`,
    "GET",
    incident ? 200 : 404
  );

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  // Fetch linked GenLayer decision if present
  let genlayerDecision = null;
  if (incident.genlayer_decision_id) {
    const { data: decision } = await service
      .from("genlayer_decisions")
      .select(
        "id, consensus_status, threat_level, recommended_action, confidence_label, support_level, tx_hash, explorer_url, source_of_truth, finalized_at"
      )
      .eq("id", incident.genlayer_decision_id)
      .maybeSingle();
    genlayerDecision = decision;
  }

  return NextResponse.json({
    incident,
    genlayer_decision: genlayerDecision,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiKeyUse } from "@/lib/api-keys/authenticate";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/v1/protocols/:id/status
// Returns current threat state for a protocol.
// Required scope: protocols:read
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await authenticateApiKey(
    request.headers.get("authorization"),
    "protocols:read"
  );

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { api_key_id, organisation_id } = auth.key;
  const service = await createServiceClient();

  const { data: protocol } = await service
    .from("protocols")
    .select(
      "id, name, slug, current_status, current_threat_level, current_recommended_action, emergency_mode, last_signal_at, last_genlayer_decision_at"
    )
    .eq("id", id)
    .eq("organisation_id", organisation_id)
    .maybeSingle();

  await logApiKeyUse(
    api_key_id,
    organisation_id,
    `/api/v1/protocols/${id}/status`,
    "GET",
    protocol ? 200 : 404
  );

  if (!protocol) {
    return NextResponse.json({ error: "Protocol not found" }, { status: 404 });
  }

  return NextResponse.json({
    protocol_id: protocol.id,
    name: protocol.name,
    slug: protocol.slug,
    status: protocol.current_status,
    threat_level: protocol.current_threat_level,
    recommended_action: protocol.current_recommended_action,
    emergency_mode: protocol.emergency_mode,
    last_signal_at: protocol.last_signal_at,
    last_genlayer_decision_at: protocol.last_genlayer_decision_at,
  });
}

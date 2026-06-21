import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { glGetProtocolState, glGetIncident, glIsProtocolRegistered, glIsIncidentSubmitted, glIsIncidentAdjudicated } from "@/lib/genlayer/client";

/**
 * GET /api/genlayer/contract-state?protocol_key=...&incident_key=...
 * Reads live state from the GenLayer contract for comparison with Supabase.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await createServiceClient();
  const membershipResult = await service
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membershipResult.data) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const protocolKey = request.nextUrl.searchParams.get("protocol_key");
  const incidentKey = request.nextUrl.searchParams.get("incident_key");

  const result: Record<string, unknown> = { timestamp: new Date().toISOString() };

  if (protocolKey) {
    try {
      const [state, registered] = await Promise.all([
        glGetProtocolState(protocolKey).catch(() => null),
        glIsProtocolRegistered(protocolKey).catch(() => null),
      ]);
      result.protocol = { key: protocolKey, registered, state };
    } catch (err) {
      result.protocol = { key: protocolKey, error: String(err) };
    }
  }

  if (incidentKey) {
    try {
      const [verdict, submitted, adjudicated] = await Promise.all([
        glGetIncident(incidentKey).catch(() => null),
        glIsIncidentSubmitted(incidentKey).catch(() => null),
        glIsIncidentAdjudicated(incidentKey).catch(() => null),
      ]);
      result.incident = { key: incidentKey, submitted, adjudicated, verdict };
    } catch (err) {
      result.incident = { key: incidentKey, error: String(err) };
    }
  }

  return NextResponse.json(result);
}

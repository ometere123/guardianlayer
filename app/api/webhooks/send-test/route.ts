import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { deliverWebhookEvent } from "@/lib/webhooks/deliver";

/**
 * POST /api/webhooks/send-test
 * Fires a synthetic incident.adjudicated event to all active endpoints for the org.
 * Used to verify webhook delivery and HMAC signature from the UI.
 */
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

  const body = await request.json() as { endpoint_id?: string };

  // If a specific endpoint_id is given, only send to that one
  // Otherwise fire to all active endpoints
  await deliverWebhookEvent(
    service,
    membership.organisation_id,
    "incident.adjudicated",
    {
      incident_id: "test-00000000-0000-0000-0000-000000000000",
      incident_key: "inc-smoketest",
      title: "[Test] Webhook delivery verification",
      threat_level: "elevated",
      recommended_action: "monitor_closely",
      confidence_label: "high",
      source_of_truth: "genlayer",
      test: true,
      endpoint_id: body.endpoint_id ?? null,
    }
  );

  return NextResponse.json({ ok: true, message: "Test event fired to all active endpoints subscribed to incident.adjudicated" });
}

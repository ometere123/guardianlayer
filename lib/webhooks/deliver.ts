import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type ServiceClient = SupabaseClient<Database>;

function signPayload(secret: string, body: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Fan-out a webhook event to all active endpoints for the organisation.
 * Logs every delivery attempt to webhook_deliveries using the column names
 * from 001_initial_schema.sql: endpoint_id, event_type, response_code, status.
 */
export async function deliverWebhookEvent(
  service: ServiceClient,
  organisationId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { data: endpoints } = await service
    .from("webhook_endpoints")
    .select("id, url, secret, events")
    .eq("organisation_id", organisationId)
    .eq("status", "active");

  if (!endpoints || endpoints.length === 0) return;

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    organisation_id: organisationId,
    data: payload,
  });

  const matched = endpoints.filter(ep => {
    const events = ep.events as string[];
    return events.includes(event) || events.includes("*");
  });

  await Promise.allSettled(matched.map(ep => deliverOne(service, ep as EndpointRow, organisationId, body)));
}

type EndpointRow = {
  id: string;
  url: string;
  secret: string;
  events: string[];
};

async function deliverOne(
  service: ServiceClient,
  endpoint: EndpointRow,
  organisationId: string,
  body: string
): Promise<void> {
  const signingSecret = process.env.WEBHOOK_SIGNING_SECRET ?? endpoint.secret;
  const signature = signPayload(signingSecret, body);

  let responseCode = 0;
  let responseBody: string | null = null;
  let status = "failed";

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Guardian-Signature": signature,
        "User-Agent": "GuardianLayer-Webhook/1.0",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    responseCode = res.status;
    responseBody = await res.text().catch(() => null);
    status = res.ok ? "delivered" : "failed";
  } catch {
    status = "failed";
  }

  // Log delivery using the actual schema column names from 001_initial_schema.sql
  service
    .from("webhook_deliveries")
    .insert({
      organisation_id: organisationId,
      endpoint_id: endpoint.id,
      event_type: JSON.parse(body).event as string,
      payload_json: JSON.parse(body),
      status,
      response_code: responseCode || null,
      response_body: responseBody,
      attempt_count: 1,
      delivered_at: status === "delivered" ? new Date().toISOString() : null,
    })
    .then(() => { /* fire-and-forget */ });
}

import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiKeyUse } from "@/lib/api-keys/authenticate";
import { createServiceClient } from "@/lib/supabase/server";
import crypto from "crypto";

// POST /api/v1/signals
// Submit an exploit/risk signal for a monitored protocol.
// Required scope: signals:write
export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(
    request.headers.get("authorization"),
    "signals:write"
  );

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { api_key_id, organisation_id } = auth.key;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  // Required fields
  if (!b.protocol_id || typeof b.protocol_id !== "string") {
    return NextResponse.json({ error: "protocol_id is required" }, { status: 422 });
  }
  if (!b.signal_type || typeof b.signal_type !== "string") {
    return NextResponse.json({ error: "signal_type is required" }, { status: 422 });
  }
  if (!b.title || typeof b.title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 422 });
  }
  if (!b.summary || typeof b.summary !== "string") {
    return NextResponse.json({ error: "summary is required" }, { status: 422 });
  }

  // Injection guard — caller must NOT supply verdict fields
  const forbidden = [
    "verdict",
    "hard_pause",
    "recommended_action",
    "threat_level",
    "confidence_label",
    "support_level",
    "genlayer_decision",
    "status",
  ];
  for (const field of forbidden) {
    if (field in b) {
      return NextResponse.json(
        { error: `Field '${field}' is not accepted on signal submission` },
        { status: 422 }
      );
    }
  }

  const service = await createServiceClient();

  // Verify protocol belongs to this org
  const { data: protocol } = await service
    .from("protocols")
    .select("id, organisation_id, current_status")
    .eq("id", b.protocol_id as string)
    .eq("organisation_id", organisation_id)
    .maybeSingle();

  if (!protocol) {
    return NextResponse.json(
      { error: "Protocol not found or not in your organisation" },
      { status: 404 }
    );
  }

  // Build canonical payload hash for deduplication
  const canonical = JSON.stringify({
    protocol_id: b.protocol_id,
    signal_type: b.signal_type,
    title: b.title,
    summary: b.summary,
  });
  const source_hash = crypto.createHash("sha256").update(canonical).digest("hex");

  const { data: signal, error } = await service
    .from("signals")
    .insert({
      organisation_id,
      protocol_id: b.protocol_id as string,
      source_type: typeof b.source_type === "string" ? b.source_type : "api",
      signal_type: b.signal_type as string,
      severity_hint: typeof b.severity_hint === "string" ? b.severity_hint : "medium",
      title: b.title as string,
      summary: b.summary as string,
      raw_payload_json: body as import("@/lib/supabase/types").Json,
      evidence_urls: Array.isArray(b.evidence_urls) ? b.evidence_urls as string[] : [],
      affected_contracts: Array.isArray(b.affected_contracts) ? b.affected_contracts as string[] : [],
      affected_wallets: Array.isArray(b.affected_wallets) ? b.affected_wallets as string[] : [],
      tx_hashes: Array.isArray(b.tx_hashes) ? b.tx_hashes as string[] : [],
      source_hash,
      submitted_by_api_key_id: api_key_id,
      status: "new",
    })
    .select("id, created_at, source_hash")
    .single();

  const statusCode = error ? 500 : 201;

  await logApiKeyUse(api_key_id, organisation_id, "/api/v1/signals", "POST", statusCode);

  if (error || !signal) {
    return NextResponse.json({ error: "Failed to create signal" }, { status: 500 });
  }

  return NextResponse.json(
    { signal_id: signal.id, created_at: signal.created_at, source_hash: signal.source_hash },
    { status: 201 }
  );
}

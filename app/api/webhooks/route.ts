import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/write";
import crypto from "crypto";

// GET /api/webhooks - list endpoints
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await createServiceClient();
  const membershipResult = await service
    .from("organisation_members").select("organisation_id").eq("user_id", user.id).limit(1).maybeSingle();
  const membership = membershipResult.data as { organisation_id: string } | null;
  if (!membership) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { data } = await service
    .from("webhook_endpoints")
    .select("id, name, url, events, status, created_at")
    .eq("organisation_id", membership.organisation_id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ endpoints: data ?? [] });
}

// POST /api/webhooks - create endpoint
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await createServiceClient();
  const membershipResult = await service
    .from("organisation_members").select("organisation_id, role").eq("user_id", user.id).limit(1).maybeSingle();
  const membership = membershipResult.data as { organisation_id: string; role: string } | null;
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as { name?: string; url?: string; events?: string[] };
  const { name, url, events } = body;

  if (!name?.trim() || !url?.trim() || !events?.length) {
    return NextResponse.json({ error: "name, url, and events required" }, { status: 400 });
  }

  // Validate URL
  try { new URL(url); } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Generate a per-endpoint signing secret (HMAC key)
  const secret = crypto.randomBytes(32).toString("hex");

  const { data: endpoint, error } = await service
    .from("webhook_endpoints")
    .insert({
      organisation_id: membership.organisation_id,
      name: name.trim(),
      url: url.trim(),
      secret,
      events,
      status: "active",
      created_by: user.id,
    })
    .select("id, name, url, events, status, created_at")
    .single();

  if (error || !endpoint) {
    return NextResponse.json({ error: "Failed to create endpoint" }, { status: 500 });
  }

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "webhook.created",
    target_type: "webhook_endpoint",
    target_id: endpoint.id,
    metadata_json: { name, url, events },
  });

  return NextResponse.json({ ok: true, endpoint });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateApiKey, ALL_SCOPES, type ApiKeyScopes } from "@/lib/api-keys/generate";
import { writeAuditLog } from "@/lib/audit/write";

// GET /api/keys - list keys for authenticated user's org
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await createServiceClient();
  const { data: membership } = await service
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.organisation_id) {
    return NextResponse.json({ error: "No organisation" }, { status: 400 });
  }

  const { data: keys } = await service
    .from("api_keys")
    .select("id, name, prefix, scopes, status, created_at, last_used_at, revoked_at")
    .eq("organisation_id", membership.organisation_id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: keys ?? [] });
}

// POST /api/keys - create a new API key
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const name = body.name.trim().slice(0, 80);
  const env: "live" | "test" = body.env === "test" ? "test" : "live";
  const scopes: ApiKeyScopes[] = Array.isArray(body.scopes)
    ? body.scopes.filter((s: string) => (ALL_SCOPES as string[]).includes(s))
    : ALL_SCOPES;

  if (!scopes.length) {
    return NextResponse.json({ error: "At least one scope required" }, { status: 400 });
  }

  const service = await createServiceClient();

  const membershipResult = await service
    .from("organisation_members")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const membership = membershipResult.data as { organisation_id: string; role: string } | null;
  if (!membership?.organisation_id) {
    return NextResponse.json({ error: "No organisation" }, { status: 400 });
  }

  const allowed = ["owner", "admin"];
  if (!allowed.includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { key, prefix, hash } = generateApiKey(env);

  const { data: inserted, error } = await service
    .from("api_keys")
    .insert({
      organisation_id: membership.organisation_id,
      name,
      prefix,
      key_hash: hash,
      scopes,
      status: "active",
      created_by: user.id,
    })
    .select("id, name, prefix, scopes, status, created_at")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "api_key.created",
    target_type: "api_key",
    target_id: inserted.id,
    metadata_json: { name, prefix, scopes, env },
  });

  // Return the plaintext key ONCE - never stored
  return NextResponse.json({ key, meta: inserted }, { status: 201 });
}

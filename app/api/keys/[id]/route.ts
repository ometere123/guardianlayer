import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/write";

// DELETE /api/keys/[id] — revoke a key
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
  if (!membership) return NextResponse.json({ error: "No organisation" }, { status: 400 });

  if (!["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Confirm key belongs to this org before revoking
  const { data: existing } = await service
    .from("api_keys")
    .select("id, name, status")
    .eq("id", id)
    .eq("organisation_id", membership.organisation_id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Key not found" }, { status: 404 });
  if (existing.status === "revoked") {
    return NextResponse.json({ error: "Key already revoked" }, { status: 409 });
  }

  await service
    .from("api_keys")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", id);

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "api_key.revoked",
    target_type: "api_key",
    target_id: id,
    metadata_json: { name: existing.name },
  });

  return NextResponse.json({ revoked: true });
}

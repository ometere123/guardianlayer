import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/write";

// DELETE /api/webhooks/:id
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
    .from("organisation_members").select("organisation_id, role").eq("user_id", user.id).limit(1).maybeSingle();
  const membership = membershipResult.data as { organisation_id: string; role: string } | null;
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await service
    .from("webhook_endpoints")
    .delete()
    .eq("id", id)
    .eq("organisation_id", membership.organisation_id);

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "webhook.deleted",
    target_type: "webhook_endpoint",
    target_id: id,
    metadata_json: null,
  });

  return NextResponse.json({ ok: true });
}

// PATCH /api/webhooks/:id — toggle status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const body = await request.json() as { status?: string };
  const allowed = ["active", "paused"];
  if (!body.status || !allowed.includes(body.status)) {
    return NextResponse.json({ error: "status must be 'active' or 'paused'" }, { status: 400 });
  }

  await service
    .from("webhook_endpoints")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organisation_id", membership.organisation_id);

  return NextResponse.json({ ok: true });
}

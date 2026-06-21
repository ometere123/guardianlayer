import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/write";

// PATCH /api/team/members/:id - update a member's role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memberId } = await params;

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

  const body = await request.json() as { role?: string };
  const allowed = ["admin", "security_analyst", "viewer"];
  if (!body.role || !allowed.includes(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Prevent changing owner's role
  const { data: target } = await service
    .from("organisation_members")
    .select("user_id, role")
    .eq("id", memberId)
    .eq("organisation_id", membership.organisation_id)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if ((target as Record<string, unknown>).role === "owner") {
    return NextResponse.json({ error: "Cannot change the owner's role" }, { status: 400 });
  }

  await service
    .from("organisation_members")
    .update({ role: body.role as "admin" | "security_analyst" | "viewer" })
    .eq("id", memberId)
    .eq("organisation_id", membership.organisation_id);

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "team.role_changed",
    target_type: "member",
    target_id: memberId,
    metadata_json: { new_role: body.role },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/team/members/:id - remove a member
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memberId } = await params;

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

  const { data: target } = await service
    .from("organisation_members")
    .select("user_id, role")
    .eq("id", memberId)
    .eq("organisation_id", membership.organisation_id)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if ((target as Record<string, unknown>).role === "owner") {
    return NextResponse.json({ error: "Cannot remove the owner" }, { status: 400 });
  }
  // Prevent self-removal
  if ((target as Record<string, unknown>).user_id === user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  await service
    .from("organisation_members")
    .delete()
    .eq("id", memberId)
    .eq("organisation_id", membership.organisation_id);

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "team.member_removed",
    target_type: "member",
    target_id: memberId,
    metadata_json: null,
  });

  return NextResponse.json({ ok: true });
}

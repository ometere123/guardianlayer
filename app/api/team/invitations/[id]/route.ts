import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/write";

// DELETE /api/team/invitations/:id - revoke a pending invitation
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

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await service
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("organisation_id", membership.organisation_id)
    .eq("status", "pending");

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "team.invite_revoked",
    target_type: "invitation",
    target_id: id,
    metadata_json: null,
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit/write";

// POST /api/team/invite
// Invites a user to the organisation by email.
// If they already have a Supabase account, they're added directly.
// If not, Supabase sends them a magic-link invite email.
// Body: { email: string, role: "admin" | "security_analyst" | "viewer" }
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
    return NextResponse.json({ error: "Only owners and admins can invite members" }, { status: 403 });
  }

  const body = await request.json() as { email?: string; role?: string };
  const email = body.email?.trim().toLowerCase();
  const role = body.role as "admin" | "security_analyst" | "viewer" | undefined;

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  if (!role || !["admin", "security_analyst", "viewer"].includes(role)) {
    return NextResponse.json({ error: "role must be admin, security_analyst, or viewer" }, { status: 400 });
  }

  // Prevent inviting yourself
  if (email === user.email) {
    return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
  }

  // Check if already a member
  const admin = createAdminClient();
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  if (existingUser) {
    const { data: existingMember } = await service
      .from("organisation_members")
      .select("id")
      .eq("organisation_id", membership.organisation_id)
      .eq("user_id", existingUser.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({ error: "This user is already a member" }, { status: 409 });
    }

    // User exists - add directly
    await service.from("organisation_members").insert({
      organisation_id: membership.organisation_id,
      user_id: existingUser.id,
      role,
      invited_by: user.id,
    });

    await service.from("invitations").insert({
      organisation_id: membership.organisation_id,
      invited_by: user.id,
      email,
      role,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    });

    await writeAuditLog(service, {
      organisation_id: membership.organisation_id,
      actor_user_id: user.id,
      action: "team.member_added",
      target_type: "user",
      target_id: existingUser.id,
      metadata_json: { email, role, method: "direct" },
    });

    return NextResponse.json({ ok: true, method: "added_directly", email, role });
  }

  // User doesn't exist - send Supabase invite email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/api/auth/callback?next=/onboarding`,
    data: {
      guardian_org_id: membership.organisation_id,
      guardian_role: role,
      invited_by: user.id,
    },
  });

  if (inviteError || !inviteData?.user) {
    return NextResponse.json({ error: inviteError?.message ?? "Failed to send invite" }, { status: 500 });
  }

  // Store invitation record
  const { data: invitation } = await service.from("invitations").insert({
    organisation_id: membership.organisation_id,
    invited_by: user.id,
    email,
    role,
    status: "pending",
  }).select("id, token").single();

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "team.invite_sent",
    target_type: "invitation",
    target_id: invitation?.id ?? null,
    metadata_json: { email, role },
  });

  return NextResponse.json({ ok: true, method: "invite_email_sent", email, role });
}

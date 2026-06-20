import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;
      const meta = user.user_metadata as Record<string, unknown> | null;

      // If this user was invited to an org, auto-join them
      const guardianOrgId = meta?.guardian_org_id as string | undefined;
      const guardianRole = meta?.guardian_role as string | undefined;
      const invitedBy = meta?.invited_by as string | undefined;

      if (guardianOrgId && guardianRole) {
        const service = await createServiceClient();

        // Add to organisation_members (ignore conflict if already exists)
        await service.from("organisation_members").upsert({
          organisation_id: guardianOrgId,
          user_id: user.id,
          role: guardianRole as "admin" | "security_analyst" | "viewer",
          invited_by: invitedBy ?? null,
        }, { onConflict: "organisation_id,user_id" });

        // Mark invitation as accepted
        await service
          .from("invitations")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("organisation_id", guardianOrgId)
          .eq("email", user.email ?? "")
          .eq("status", "pending");

        // Create user profile if missing
        await service.from("user_profiles").upsert({
          id: user.id,
          email: user.email ?? "",
          display_name: (user.email ?? "").split("@")[0],
          default_organisation_id: guardianOrgId,
          onboarding_completed: true,
        }, { onConflict: "id" });

        return NextResponse.redirect(`${origin}/app/overview`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

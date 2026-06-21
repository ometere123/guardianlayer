import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { TeamManager } from "@/components/team/TeamManager";

export const metadata = { title: "Team - Guardian Layer" };

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = await createServiceClient();

  const membershipResult = await service
    .from("organisation_members")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const membership = membershipResult.data as { organisation_id: string; role: string } | null;
  if (!membership?.organisation_id) redirect("/onboarding");

  const orgId = membership.organisation_id;

  const [membersRes, invitesRes, orgRes] = await Promise.all([
    service
      .from("organisation_members")
      .select("id, user_id, role, invited_by, created_at")
      .eq("organisation_id", orgId)
      .order("created_at"),
    service
      .from("invitations")
      .select("id, email, role, status, expires_at, created_at")
      .eq("organisation_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    service
      .from("organisations")
      .select("name, slug, plan")
      .eq("id", orgId)
      .maybeSingle(),
  ]);

  // Hydrate member emails from user_profiles
  const memberRows = (membersRes.data ?? []) as Array<{
    id: string; user_id: string; role: string; invited_by: string | null; created_at: string;
  }>;

  const profileIds = memberRows.map(m => m.user_id);
  const { data: profiles } = await service
    .from("user_profiles")
    .select("id, email, display_name")
    .in("id", profileIds);

  const profileMap = Object.fromEntries(
    ((profiles ?? []) as Array<{ id: string; email: string; display_name: string | null }>)
      .map(p => [p.id, p])
  );

  const members = memberRows.map(m => ({
    ...m,
    email: profileMap[m.user_id]?.email ?? "-",
    display_name: profileMap[m.user_id]?.display_name ?? null,
    is_self: m.user_id === user.id,
  }));

  const invitations = (invitesRes.data ?? []) as Array<{
    id: string; email: string; role: string; status: string; expires_at: string; created_at: string;
  }>;

  const org = orgRes.data as { name: string; slug: string; plan: string } | null;
  const canManage = ["owner", "admin"].includes(membership.role);

  return (
    <TeamManager
      members={members}
      invitations={invitations}
      currentRole={membership.role}
      orgName={org?.name ?? "Your Organisation"}
      canManage={canManage}
    />
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { GuardianNav } from "@/components/shell/GuardianNav";
import { CommandRibbon } from "@/components/shell/CommandRibbon";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const service = await createServiceClient();

  // Load profile and org
  const profileResult = await service
    .from("user_profiles")
    .select("display_name, email, onboarding_completed, default_organisation_id")
    .eq("id", user.id)
    .maybeSingle();

  const membershipResult = await service
    .from("organisation_members")
    .select("organisation_id, role, organisations(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileResult.data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membership = membershipResult.data as any;

  // Redirect to onboarding if not complete
  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  const orgName = membership?.organisations?.name ?? "Your Organisation";

  return (
    <div className="flex h-screen bg-[#070A12] overflow-hidden">
      <GuardianNav />
      <div className="flex-1 flex flex-col min-w-0">
        <CommandRibbon
          orgName={orgName}
          userEmail={profile?.email ?? user.email}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

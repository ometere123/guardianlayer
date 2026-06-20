import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { truncateAddress } from "@/lib/utils";
import { BadgeCheck, Building2, KeyRound, LogOut, Shield, User } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Profile - Guardian Layer" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = await createServiceClient();

  const [profileRes, membershipRes, walletRes, keyRes] = await Promise.all([
    service
      .from("user_profiles")
      .select("display_name, email, onboarding_completed, default_organisation_id, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    service
      .from("organisation_members")
      .select("role, created_at, organisations(id, name, plan, status)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
    service
      .from("wallets")
      .select("wallet_address, created_at")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .maybeSingle(),
    service
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id)
      .eq("status", "active"),
  ]);

  const profile = profileRes.data;
  const membership = membershipRes.data as {
    role: string;
    created_at: string;
    organisations: { id: string; name: string; plan: string; status: string } | null;
  } | null;
  const wallet = walletRes.data;
  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "Guardian user";
  const org = membership?.organisations;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <User className="w-5 h-5 text-[#38BDF8]" />
            <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">Profile</h1>
          </div>
          <p className="text-sm text-[#64748B]">{displayName}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#121827] border border-[#243044] text-sm text-[#9AA7B8] hover:text-[#F4F7FB] hover:border-[#EF4444]/30 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 command-panel p-5 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[10px] bg-[#071e2e] border border-[#38BDF8]/20 flex items-center justify-center">
              <User className="w-6 h-6 text-[#38BDF8]" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-[#F4F7FB] truncate">{displayName}</p>
              <p className="text-sm text-[#64748B] truncate">{profile?.email ?? user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoRow label="User ID" value={user.id} mono />
            <InfoRow label="Onboarding" value={profile?.onboarding_completed ? "Complete" : "Incomplete"} />
            <InfoRow label="Org Role" value={membership?.role ?? "None"} />
            <InfoRow label="Active API Keys" value={String(keyRes.count ?? 0)} />
          </div>
        </section>

        <section className="command-panel p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#22C55E]" />
            <h2 className="text-sm font-semibold text-[#F4F7FB]">Identity</h2>
          </div>
          {wallet?.wallet_address ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[#64748B] uppercase tracking-wider">Embedded Wallet</p>
              <code className="text-sm font-mono-gl text-[#38BDF8] break-all">
                {wallet.wallet_address}
              </code>
              <p className="text-xs text-[#64748B]">{truncateAddress(wallet.wallet_address, 8)}</p>
            </div>
          ) : (
            <Link href="/onboarding/wallet" className="text-sm text-[#38BDF8] hover:underline">
              Generate wallet
            </Link>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionCard
          icon={Building2}
          title={org?.name ?? "No organisation"}
          label={`${org?.plan ?? "starter"} / ${org?.status ?? "pending"}`}
          href="/app/settings"
        />
        <ActionCard
          icon={KeyRound}
          title="API Key Vault"
          label={`${keyRes.count ?? 0} active keys`}
          href="/app/api-keys"
        />
        <ActionCard
          icon={BadgeCheck}
          title="Team Access"
          label={membership ? `Joined ${new Date(membership.created_at).toLocaleDateString()}` : "Not joined"}
          href="/app/team"
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[8px] bg-[#070A12] border border-[#243044] p-3 min-w-0">
      <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1">{label}</p>
      <p className={`${mono ? "font-mono-gl text-xs" : "text-sm"} text-[#F4F7FB] truncate`}>{value}</p>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  label,
  href,
}: {
  icon: typeof Building2;
  title: string;
  label: string;
  href: string;
}) {
  return (
    <Link href={href} className="command-panel p-4 flex items-center gap-3 hover:border-[#38BDF8]/30 transition-colors">
      <div className="w-9 h-9 rounded-[8px] bg-[#121827] flex items-center justify-center">
        <Icon className="w-4 h-4 text-[#38BDF8]" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#F4F7FB] truncate">{title}</p>
        <p className="text-xs text-[#64748B] truncate">{label}</p>
      </div>
    </Link>
  );
}

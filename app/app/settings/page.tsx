import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Activity, Building2, Key, Settings, Shield, Users, Webhook } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Settings - Guardian Layer" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = await createServiceClient();
  const membershipResult = await service
    .from("organisation_members")
    .select("organisation_id, role, organisations(id, name, slug, plan, status, owner_wallet_address, created_at)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const membership = membershipResult.data as {
    organisation_id: string;
    role: string;
    organisations: {
      id: string;
      name: string;
      slug: string;
      plan: string;
      status: string;
      owner_wallet_address: string | null;
      created_at: string;
    } | null;
  } | null;

  if (!membership?.organisation_id) redirect("/onboarding");

  const org = membership.organisations;
  const [membersRes, protocolsRes, apiKeysRes, webhooksRes] = await Promise.all([
    service
      .from("organisation_members")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", membership.organisation_id),
    service
      .from("protocols")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", membership.organisation_id),
    service
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", membership.organisation_id)
      .eq("status", "active"),
    service
      .from("webhook_endpoints")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", membership.organisation_id)
      .eq("status", "active"),
  ]);

  const canManage = ["owner", "admin"].includes(membership.role);

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-5 h-5 text-[#38BDF8]" />
            <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">Settings</h1>
          </div>
          <p className="text-sm text-[#64748B]">{org?.name ?? "Organisation"} command configuration</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#121827] border border-[#243044] text-xs text-[#9AA7B8] capitalize">
          {membership.role.replace("_", " ")}
        </span>
      </div>

      <section className="command-panel p-5 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#38BDF8]" />
          <h2 className="text-sm font-semibold text-[#F4F7FB]">Organisation</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <SettingMetric label="Name" value={org?.name ?? "Unknown"} />
          <SettingMetric label="Plan" value={org?.plan ?? "starter"} />
          <SettingMetric label="Status" value={org?.status ?? "active"} />
          <SettingMetric label="Created" value={org?.created_at ? new Date(org.created_at).toLocaleDateString() : "Unknown"} />
        </div>

        <div className="rounded-[8px] bg-[#070A12] border border-[#243044] p-3">
          <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1">Owner Wallet</p>
          <code className="text-xs font-mono-gl text-[#38BDF8] break-all">
            {org?.owner_wallet_address ?? "No owner wallet stored"}
          </code>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="command-panel p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#22C55E]" />
            <h2 className="text-sm font-semibold text-[#F4F7FB]">Security Posture</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SettingMetric label="Members" value={String(membersRes.count ?? 0)} />
            <SettingMetric label="Protocols" value={String(protocolsRes.count ?? 0)} />
            <SettingMetric label="Active Keys" value={String(apiKeysRes.count ?? 0)} />
            <SettingMetric label="Webhooks" value={String(webhooksRes.count ?? 0)} />
          </div>
        </section>

        <section className="command-panel p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#EAB308]" />
            <h2 className="text-sm font-semibold text-[#F4F7FB]">Operations</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SettingsLink icon={Users} label="Team" href="/app/team" disabled={!canManage} />
            <SettingsLink icon={Key} label="API Keys" href="/app/api-keys" disabled={!canManage} />
            <SettingsLink icon={Webhook} label="Webhooks" href="/app/webhooks" disabled={!canManage} />
            <SettingsLink icon={Shield} label="Protocols" href="/app/protocols" />
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#070A12] border border-[#243044] p-3 min-w-0">
      <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-[#F4F7FB] truncate">{value}</p>
    </div>
  );
}

function SettingsLink({
  icon: Icon,
  label,
  href,
  disabled = false,
}: {
  icon: typeof Users;
  label: string;
  href: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="rounded-[8px] bg-[#070A12] border border-[#243044] p-3 flex items-center gap-3 opacity-50">
        <Icon className="w-4 h-4 text-[#64748B]" />
        <span className="text-sm text-[#64748B]">{label}</span>
      </div>
    );
  }

  return (
    <Link href={href} className="rounded-[8px] bg-[#070A12] border border-[#243044] p-3 flex items-center gap-3 hover:border-[#38BDF8]/30 transition-colors">
      <Icon className="w-4 h-4 text-[#38BDF8]" />
      <span className="text-sm text-[#F4F7FB]">{label}</span>
    </Link>
  );
}

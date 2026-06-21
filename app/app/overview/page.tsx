import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MetricCard, EmptyState } from "@/components/ui/EmptyState";
import { ThreatLevelBadge, ConsensusBadge, ProtocolStatusBadge } from "@/components/ui/Badge";
import { Shield, AlertTriangle, Radio, Cpu, Activity, Webhook, Plus } from "lucide-react";
import Link from "next/link";
import { formatTimeAgo } from "@/lib/utils";

export const metadata = { title: "Guardian Command" };

export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = await createServiceClient();

  const membershipResult = await service
    .from("organisation_members")
    .select("organisation_id, organisations(id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membership = membershipResult.data as any;
  const orgId: string | undefined = membership?.organisation_id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyRow = any;

  const [protocolsRes, incidentsRes, decisionsRes, walletRes] = await Promise.all([
    orgId
      ? service.from("protocols").select("id, name, slug, current_status, current_threat_level, current_recommended_action, emergency_mode, last_signal_at, last_genlayer_decision_at").eq("organisation_id", orgId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as AnyRow[] }),
    orgId
      ? service.from("incidents").select("id, title, status, threat_level, recommended_action, created_at").eq("organisation_id", orgId).in("status", ["open", "under_review", "genlayer_pending"]).order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [] as AnyRow[] }),
    orgId
      ? service.from("genlayer_decisions").select("id, threat_level, recommended_action, confidence_label, consensus_status, created_at, tx_hash, explorer_url").eq("organisation_id", orgId).order("created_at", { ascending: false }).limit(1)
      : Promise.resolve({ data: [] as AnyRow[] }),
    service.from("wallets").select("wallet_address").eq("user_id", user.id).eq("is_primary", true).maybeSingle(),
  ]);

  const protocols = protocolsRes.data as AnyRow[];
  const incidents = incidentsRes.data as AnyRow[];
  const decisions = decisionsRes.data as AnyRow[];
  const wallet = walletRes.data as AnyRow;

  const criticalCount = protocols?.filter(p => p.current_threat_level === "critical").length ?? 0;
  const pauseCount = protocols?.filter(p => p.current_status === "pause_recommended" || p.current_status === "paused").length ?? 0;
  const openIncidentCount = incidents?.length ?? 0;
  const latestDecision = decisions?.[0] ?? null;

  const highestThreat = protocols?.reduce<string>((max, p) => {
    const order = ["none", "low", "elevated", "high", "critical"];
    return order.indexOf(p.current_threat_level) > order.indexOf(max) ? p.current_threat_level : max;
  }, "none") ?? "none";

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">Guardian Command</h1>
          <p className="text-sm text-[#64748B] mt-1">Protocol risk state, open incidents, and GenLayer decision status</p>
        </div>
        {highestThreat === "none" ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#14261a] border border-[#22C55E]/20">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-blink" />
            <span className="text-xs text-[#22C55E] font-medium">All Systems Normal</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2a0a0a] border border-[#EF4444]/20">
            <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-blink" />
            <span className="text-xs text-[#EF4444] font-medium">Threat Detected</span>
          </div>
        )}
      </div>

      {/* Wallet strip */}
      {wallet?.wallet_address && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-[10px] bg-[#0D111C] border border-[#243044]">
          <Shield className="w-4 h-4 text-[#38BDF8] flex-shrink-0" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs text-[#64748B]">Embedded wallet</span>
            <code className="text-xs font-mono-gl text-[#9AA7B8] truncate">{wallet.wallet_address}</code>
          </div>
          <span className="text-[10px] font-mono-gl text-[#243044] flex-shrink-0">GenLayer identity</span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard label="Active Protocols"   value={protocols?.length ?? 0}  accent="cyan"   />
        <MetricCard label="Open Incidents"     value={openIncidentCount}        accent={openIncidentCount > 0 ? "yellow" : undefined} />
        <MetricCard label="Critical Threats"   value={criticalCount}            accent={criticalCount > 0 ? "red" : undefined} />
        <MetricCard label="Pause Recommended"  value={pauseCount}               accent={pauseCount > 0 ? "red" : undefined} />
        <MetricCard label="GenLayer Decisions" value={decisions?.length ?? 0}   accent="violet" />
        <MetricCard label="Webhooks"           value="—" />
      </div>

      {/* Protocol Risk Heatmap */}
      {protocols?.length > 0 && (
        <div className="command-panel p-5">
          <h2 className="text-sm font-semibold text-[#9AA7B8] uppercase tracking-wider mb-3">Protocol Risk Heatmap</h2>
          <div className="flex flex-wrap gap-2">
            {protocols.map((p: AnyRow) => {
              const colors: Record<string, string> = {
                critical: "bg-[#EF4444] text-white",
                high: "bg-[#F97316] text-white",
                elevated: "bg-[#EAB308] text-[#070A12]",
                low: "bg-[#22C55E]/20 text-[#22C55E]",
                none: "bg-[#121827] text-[#64748B]",
              };
              const statusDot: Record<string, string> = {
                paused: "bg-[#EF4444]",
                pause_recommended: "bg-[#F97316]",
                under_review: "bg-[#EAB308]",
                monitoring: "bg-[#22C55E]",
                normal: "bg-[#22C55E]",
                disabled: "bg-[#64748B]",
              };
              return (
                <Link
                  key={p.id}
                  href={`/app/protocols/${p.id}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-[8px] text-xs font-medium transition-opacity hover:opacity-80 ${colors[p.current_threat_level] ?? colors.none}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[p.current_status] ?? statusDot.normal}`} />
                  {p.name}
                  <span className="opacity-60 uppercase text-[10px]">{p.current_threat_level}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Risk + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 command-panel p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#9AA7B8] uppercase tracking-wider">Guardian State</h2>
            {latestDecision ? (
              <ConsensusBadge status={latestDecision.consensus_status as "pending" | "finalized" | "failed"} />
            ) : (
              <span className="text-xs text-[#64748B]">No decisions yet</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-[#64748B] uppercase tracking-wider">Highest Threat</p>
              <ThreatLevelBadge level={highestThreat as "none" | "low" | "elevated" | "high" | "critical"} />
            </div>
            <div className="w-px h-8 bg-[#243044]" />
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-[#64748B] uppercase tracking-wider">Protocols</p>
              <p className="text-sm font-semibold text-[#F4F7FB]">{protocols?.length ?? 0} registered</p>
            </div>
            {latestDecision && (
              <>
                <div className="w-px h-8 bg-[#243044]" />
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] text-[#64748B] uppercase tracking-wider">Last Decision</p>
                  <p className="text-sm text-[#9AA7B8]">{formatTimeAgo(latestDecision.created_at)}</p>
                </div>
              </>
            )}
          </div>

          {!protocols?.length ? (
            <div className="mt-2 p-4 rounded-[12px] bg-[#070A12] border border-[#243044]">
              <p className="text-sm text-[#64748B]">
                No protocols registered yet.{" "}
                <Link href="/app/protocols/new" className="text-[#38BDF8] hover:underline">
                  Register your first protocol →
                </Link>
              </p>
            </div>
          ) : (
            /* Open incidents */
            <div className="flex flex-col gap-2 mt-1">
              {incidents?.map(inc => (
                <Link
                  key={inc.id}
                  href={`/app/incidents/${inc.id}`}
                  className="flex items-center gap-3 p-3 rounded-[10px] bg-[#070A12] border border-[#243044] hover:border-[#38BDF8]/30 transition-colors"
                >
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${inc.threat_level === "critical" ? "text-[#EF4444]" : inc.threat_level === "high" ? "text-[#F97316]" : "text-[#EAB308]"}`} />
                  <span className="text-sm text-[#F4F7FB] flex-1 truncate">{inc.title}</span>
                  <span className="text-xs text-[#64748B]">{formatTimeAgo(inc.created_at)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="command-panel p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[#9AA7B8] uppercase tracking-wider">Quick Actions</h2>
          {[
            { icon: Shield,        label: "Register Protocol",  href: "/app/protocols/new", color: "text-[#38BDF8]" },
            { icon: Radio,         label: "Submit Signal",       href: "/app/signals/new",   color: "text-[#EAB308]" },
            { icon: AlertTriangle, label: "Incidents",          href: "/app/incidents",     color: "text-[#F97316]" },
            { icon: Cpu,           label: "GenLayer Decisions", href: "/app/genlayer",      color: "text-[#8B5CF6]" },
            { icon: Activity,      label: "Audit Ledger",       href: "/app/audit-logs",    color: "text-[#64748B]" },
            { icon: Webhook,       label: "Webhook Relay",      href: "/app/webhooks",      color: "text-[#64748B]" },
          ].map(({ icon: Icon, label, href, color }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 py-2 px-3 rounded-[8px] hover:bg-[#121827] transition-colors group"
            >
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-sm text-[#9AA7B8] group-hover:text-[#F4F7FB] transition-colors">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Protocol table */}
      <div className="command-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#9AA7B8] uppercase tracking-wider">Protocol Registry</h2>
          <Link href="/app/protocols/new" className="flex items-center gap-1 text-xs text-[#38BDF8] hover:underline">
            <Plus className="w-3 h-3" /> Register Protocol
          </Link>
        </div>

        {!protocols?.length ? (
          <EmptyState
            icon={Shield}
            title="No protocols registered"
            description="Register your first protocol to begin monitoring exploit signals."
            action={
              <Link
                href="/app/protocols/new"
                className="px-4 py-2 rounded-[8px] bg-[#38BDF8] text-[#070A12] text-sm font-bold hover:bg-[#7DD3FC] transition-colors"
              >
                Register Protocol
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#243044]">
                  {["Protocol", "Status", "Threat", "Mode", "Last Signal", "Last Decision"].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-wider pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {protocols.map(p => (
                  <tr key={p.id} className="border-b border-[#243044]/50 hover:bg-[#121827]/50 transition-colors">
                    <td className="py-3 pr-4">
                      <Link href={`/app/protocols/${p.id}`} className="font-medium text-[#F4F7FB] hover:text-[#38BDF8] transition-colors">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <ProtocolStatusBadge status={p.current_status as "normal" | "monitoring" | "under_review" | "pause_recommended" | "paused" | "disabled"} />
                    </td>
                    <td className="py-3 pr-4">
                      <ThreatLevelBadge level={p.current_threat_level as "none" | "low" | "elevated" | "high" | "critical"} />
                    </td>
                    <td className="py-3 pr-4 text-xs text-[#9AA7B8] uppercase">{p.emergency_mode.replace("_", " ")}</td>
                    <td className="py-3 pr-4 text-xs text-[#64748B]">{p.last_signal_at ? formatTimeAgo(p.last_signal_at) : "—"}</td>
                    <td className="py-3 pr-4 text-xs text-[#64748B]">{p.last_genlayer_decision_at ? formatTimeAgo(p.last_genlayer_decision_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

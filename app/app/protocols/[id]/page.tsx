import { redirect, notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ThreatLevelBadge, ProtocolStatusBadge } from "@/components/ui/Badge";
import { PausePolicyConsole } from "@/components/protocols/PausePolicyConsole";
import { AddContractForm } from "@/components/protocols/AddContractForm";
import { AuthAlert } from "@/components/auth/AuthAlert";
import { Shield, ExternalLink, Activity, AlertTriangle, Cpu } from "lucide-react";
import { GenLayerRegisterButton } from "@/components/genlayer/GenLayerRegisterButton";
import Link from "next/link";
import { formatTimeAgo, truncateAddress } from "@/lib/utils";

export const metadata = { title: "Protocol — Guardian Layer" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; saved?: string; error?: string }> };

export default async function ProtocolDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab = "overview", saved, error } = await searchParams;

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

  const { data: rawProtocol } = await service
    .from("protocols")
    .select("*")
    .eq("id", id)
    .eq("organisation_id", membership.organisation_id)
    .maybeSingle();

  if (!rawProtocol) notFound();
  const protocol = rawProtocol as Record<string, unknown>;

  const [contractsRes, policyRes, incidentsRes, decisionsRes] = await Promise.all([
    service.from("monitored_contracts").select("*").eq("protocol_id", id).order("created_at", { ascending: false }),
    service.from("pause_policies").select("*").eq("protocol_id", id).maybeSingle(),
    service.from("incidents").select("id, title, status, threat_level, created_at").eq("protocol_id", id).order("created_at", { ascending: false }).limit(5),
    service.from("genlayer_decisions").select("id, consensus_status, threat_level, recommended_action, tx_hash, explorer_url, created_at").eq("protocol_id", id).order("created_at", { ascending: false }).limit(3),
  ]);

  const contracts = (contractsRes.data ?? []) as Record<string, unknown>[];
  const policy = policyRes.data as Record<string, unknown> | null;
  const incidents = (incidentsRes.data ?? []) as Record<string, unknown>[];
  const decisions = (decisionsRes.data ?? []) as Record<string, unknown>[];

  const canManage = ["owner", "admin"].includes(membership.role);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "contracts", label: `Contracts (${contracts.length})` },
    { key: "policy", label: "Pause Policy" },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-[12px] bg-[#121827] border border-[#243044] flex items-center justify-center flex-shrink-0">
          <Shield className="w-6 h-6 text-[#38BDF8]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">{protocol.name as string}</h1>
            <ProtocolStatusBadge status={protocol.current_status as "normal" | "monitoring" | "under_review" | "pause_recommended" | "paused" | "disabled"} />
            <ThreatLevelBadge level={protocol.current_threat_level as "none" | "low" | "elevated" | "high" | "critical"} />
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-[#64748B]">
            <span className="capitalize">{protocol.category as string}</span>
            <span>·</span>
            <span className="font-mono-gl">{protocol.chain as string}/{protocol.network as string}</span>
            <span>·</span>
            <span className="uppercase">{(protocol.emergency_mode as string).replace(/_/g, " ")}</span>
            {(protocol.last_signal_at as string | null) && (
              <>
                <span>·</span>
                <Activity className="w-3 h-3" />
                <span>Last signal {formatTimeAgo(protocol.last_signal_at as string)}</span>
              </>
            )}
          </div>
          {(protocol.description as string | null) && (
            <p className="text-sm text-[#9AA7B8] mt-2">{protocol.description as string}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canManage && (
            <GenLayerRegisterButton
              protocolId={id}
              registered={protocol.genlayer_protocol_registered as boolean}
              txHash={protocol.genlayer_registration_tx_hash as string | null}
            />
          )}
          <Link
            href="/app/signals/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-[#EAB308]/10 border border-[#EAB308]/20 text-[#EAB308] text-xs font-medium hover:bg-[#EAB308]/20 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Submit Signal
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#243044]">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={`/app/protocols/${id}?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-[#38BDF8] text-[#38BDF8]"
                : "border-transparent text-[#64748B] hover:text-[#9AA7B8]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === "overview" && (
        <div className="flex flex-col gap-4">
          {/* Stat strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Contracts", value: contracts.length },
              { label: "Open Incidents", value: incidents.filter(i => i.status !== "resolved").length, accent: true },
              { label: "GenLayer Decisions", value: decisions.length },
              { label: "Protocol Key", value: protocol.protocol_key as string, mono: true },
            ].map(({ label, value, accent, mono }) => (
              <div key={label} className="command-panel p-4">
                <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">{label}</p>
                <p className={`text-lg font-bold ${accent && Number(value) > 0 ? "text-[#F97316]" : "text-[#F4F7FB]"} ${mono ? "font-mono-gl text-xs mt-1" : ""}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Recent incidents */}
          <div className="command-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#9AA7B8] uppercase tracking-wider">Recent Incidents</h2>
              <Link href="/app/incidents" className="text-xs text-[#38BDF8] hover:underline">View all</Link>
            </div>
            {incidents.length === 0 ? (
              <p className="text-sm text-[#64748B]">No incidents yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {incidents.map(inc => (
                  <Link
                    key={inc.id as string}
                    href={`/app/incidents/${inc.id}`}
                    className="flex items-center gap-3 p-3 rounded-[8px] bg-[#070A12] border border-[#243044] hover:border-[#38BDF8]/30 transition-colors"
                  >
                    <ThreatLevelBadge level={inc.threat_level as "none" | "low" | "elevated" | "high" | "critical"} />
                    <span className="flex-1 text-sm text-[#F4F7FB] truncate">{inc.title as string}</span>
                    <span className="text-xs text-[#64748B]">{formatTimeAgo(inc.created_at as string)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* GenLayer decisions */}
          <div className="command-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#9AA7B8] uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#8B5CF6]" /> GenLayer Decisions
              </h2>
              <Link href="/app/genlayer" className="text-xs text-[#8B5CF6] hover:underline">View all</Link>
            </div>
            {decisions.length === 0 ? (
              <p className="text-sm text-[#64748B]">No GenLayer decisions yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {decisions.map(d => (
                  <div key={d.id as string} className="flex items-center gap-3 p-3 rounded-[8px] bg-[#070A12] border border-[#243044]">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      d.consensus_status === "finalized"
                        ? "bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20"
                        : "bg-[#64748B]/10 text-[#64748B] border border-[#64748B]/20"
                    }`}>{d.consensus_status as string}</span>
                    <ThreatLevelBadge level={(d.threat_level ?? "none") as "none" | "low" | "elevated" | "high" | "critical"} />
                    <span className="flex-1 text-xs text-[#9AA7B8]">{(d.recommended_action as string | null) ?? "—"}</span>
                    {(d.explorer_url as string | null) && (
                      <a href={d.explorer_url as string} target="_blank" rel="noopener noreferrer" className="text-[#38BDF8] hover:text-[#7DD3FC]">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <span className="text-xs text-[#64748B]">{formatTimeAgo(d.created_at as string)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Contracts */}
      {tab === "contracts" && (
        <div className="flex flex-col gap-4">
          {error && <AuthAlert message={error} />}

          {contracts.length === 0 ? (
            <div className="command-panel p-8 text-center">
              <p className="text-sm text-[#64748B] mb-4">No contracts monitored yet. Add the contracts you want Guardian Layer to watch.</p>
            </div>
          ) : (
            <div className="command-panel overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#243044]">
                    {["Name", "Address", "Chain", "Role", "Pause Capable", "Status"].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-wider px-5 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(c => (
                    <tr key={c.id as string} className="border-b border-[#243044]/50">
                      <td className="px-5 py-3 font-medium text-[#F4F7FB]">{c.name as string}</td>
                      <td className="px-5 py-3">
                        <code className="text-xs font-mono-gl text-[#9AA7B8]">{truncateAddress(c.address as string)}</code>
                      </td>
                      <td className="px-5 py-3 text-xs text-[#64748B]">{c.chain as string}/{c.network as string}</td>
                      <td className="px-5 py-3 text-xs text-[#9AA7B8] capitalize">{c.role as string}</td>
                      <td className="px-5 py-3">
                        {c.is_pause_capable ? (
                          <span className="text-xs text-[#22C55E]">✓ {c.pause_function_name as string ?? "pause()"}</span>
                        ) : (
                          <span className="text-xs text-[#64748B]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? "bg-[#14261a] text-[#22C55E]" : "bg-[#1a1a1a] text-[#64748B]"}`}>
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canManage && (
            <AddContractForm protocolId={id} chain={protocol.chain as string} network={protocol.network as string} />
          )}
        </div>
      )}

      {/* Tab: Policy */}
      {tab === "policy" && (
        <div className="flex flex-col gap-4">
          {saved && (
            <div className="px-4 py-3 rounded-[10px] bg-[#0f2a1a] border border-[#22C55E]/30 text-sm text-[#22C55E]">
              Pause policy saved successfully.
            </div>
          )}
          <PausePolicyConsole
            protocolId={id}
            policy={policy}
            canManage={canManage}
          />
        </div>
      )}
    </div>
  );
}

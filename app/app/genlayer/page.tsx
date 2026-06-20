import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Cpu, ExternalLink, Shield, CheckCircle, Clock, AlertTriangle, Activity } from "lucide-react";
import Link from "next/link";
import { formatTimeAgo, truncateHash } from "@/lib/utils";

export const metadata = { title: "Consensus Chamber — Guardian Layer" };

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GUARDIAN_LAYER_CONTRACT_ADDRESS ?? "";
const EXPLORER_BASE = process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL ?? "https://explorer-studio.genlayer.com";

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending:     { label: "Pending Submission", color: "text-[#64748B] border-[#243044] bg-[#0f1218]", dot: "bg-[#64748B]" },
  adjudicated: { label: "Adjudicated",        color: "text-[#8B5CF6] border-[#8B5CF6]/20 bg-[#100820]", dot: "bg-[#8B5CF6]" },
  finalized:   { label: "Finalized",          color: "text-[#22C55E] border-[#22C55E]/20 bg-[#14261a]", dot: "bg-[#22C55E]" },
};

const THREAT_COLORS: Record<string, string> = {
  none:     "text-[#64748B]",
  low:      "text-[#22C55E]",
  elevated: "text-[#EAB308]",
  high:     "text-[#F97316]",
  critical: "text-[#EF4444]",
};

export default async function ConsensusChamberPage() {
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

  // Load all GenLayer decisions with linked protocol + incident data
  const { data: rawDecisions } = await service
    .from("genlayer_decisions")
    .select("*, incidents(id, title, status, incident_key), protocols(id, name, chain)")
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  const decisions = ((rawDecisions ?? []) as unknown) as Array<{
    id: string;
    protocol_id: string;
    incident_id: string;
    contract_address: string;
    tx_hash: string | null;
    evidence_hash: string;
    consensus_status: string;
    threat_level: string | null;
    recommended_action: string | null;
    confidence_label: string | null;
    support_level: string | null;
    reasoning_summary: string | null;
    explorer_url: string | null;
    source_of_truth: string;
    submitted_at: string;
    finalized_at: string | null;
    created_at: string;
    incidents: { id: string; title: string; status: string; incident_key: string } | null;
    protocols: { id: string; name: string; chain: string } | null;
  }>;

  // Load registered protocols count
  const { count: registeredCount } = await service
    .from("protocols")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", orgId)
    .eq("genlayer_protocol_registered", true);

  const finalizedCount = decisions.filter(d => d.consensus_status === "finalized").length;
  const pendingCount = decisions.filter(d => d.consensus_status === "pending").length;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-[12px] bg-[#100820] border border-[#8B5CF6]/30 flex items-center justify-center flex-shrink-0">
          <Cpu className="w-6 h-6 text-[#8B5CF6]" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">Consensus Chamber</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            GenLayer AI validators adjudicate threat verdicts. This is the authoritative source of truth.
          </p>
        </div>
        <a
          href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] text-xs font-medium hover:bg-[#8B5CF6]/20 transition-colors flex-shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" /> View Contract
        </a>
      </div>

      {/* Contract info */}
      <div className="command-panel p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs">
          <Shield className="w-3.5 h-3.5 text-[#8B5CF6]" />
          <span className="text-[#64748B]">Contract</span>
          <code className="font-mono-gl text-[#9AA7B8] flex-1">{CONTRACT_ADDRESS}</code>
          <a href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
            className="text-[#8B5CF6] hover:text-[#a78bfa]">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span className="text-[#64748B]">Network</span>
          <span className="text-[#9AA7B8]">GenLayer Studionet (chain 61999)</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Protocols Registered", value: registeredCount ?? 0, accent: false },
          { label: "Total Decisions", value: decisions.length, accent: false },
          { label: "Finalized", value: finalizedCount, accent: false },
          { label: "Awaiting Adjudication", value: pendingCount, accent: pendingCount > 0 },
        ].map(({ label, value, accent }) => (
          <div key={label} className="command-panel p-4">
            <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${accent ? "text-[#EAB308]" : "text-[#F4F7FB]"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Decision feed */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-[#8B5CF6]" /> Adjudication Log
        </h2>

        {decisions.length === 0 ? (
          <div className="command-panel p-10 text-center flex flex-col items-center gap-3">
            <Cpu className="w-10 h-10 text-[#243044]" />
            <p className="text-sm text-[#64748B]">No decisions yet.</p>
            <p className="text-xs text-[#64748B] max-w-xs">
              Register a protocol, escalate a signal to an incident, then submit it to GenLayer to request consensus adjudication.
            </p>
            <Link
              href="/app/incidents"
              className="mt-2 px-4 py-2 rounded-[8px] bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] text-sm font-medium hover:bg-[#8B5CF6]/20 transition-colors"
            >
              View Incidents →
            </Link>
          </div>
        ) : (
          decisions.map(d => {
            const statusCfg = STATUS_CONFIG[d.consensus_status] ?? STATUS_CONFIG.pending;
            const incident = d.incidents;
            const protocol = d.protocols;

            return (
              <div key={d.id} className="command-panel p-5 flex flex-col gap-4">
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-[#100820] border border-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Cpu className="w-4 h-4 text-[#8B5CF6]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                      {d.source_of_truth === "genlayer" && (
                        <span className="flex items-center gap-1 text-[10px] text-[#8B5CF6] border border-[#8B5CF6]/20 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Source of Truth
                        </span>
                      )}
                    </div>
                    {incident ? (
                      <Link
                        href={`/app/incidents/${incident.id}`}
                        className="text-sm font-medium text-[#F4F7FB] hover:text-[#8B5CF6] transition-colors truncate block"
                      >
                        {incident.title}
                      </Link>
                    ) : (
                      <p className="text-sm text-[#9AA7B8]">Incident #{truncateHash(d.incident_id, 6)}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
                      {protocol && (
                        <Link href={`/app/protocols/${protocol.id}`} className="text-[#38BDF8] hover:underline">
                          {protocol.name}
                        </Link>
                      )}
                      {protocol && <span>·</span>}
                      <span>{formatTimeAgo(d.created_at)}</span>
                      {d.finalized_at && (
                        <>
                          <span>·</span>
                          <span className="text-[#22C55E]">Finalized {formatTimeAgo(d.finalized_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verdict grid — only when finalized */}
                {d.consensus_status === "finalized" && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs border-t border-[#243044] pt-4">
                    {[
                      { label: "Threat Level", value: d.threat_level },
                      { label: "Recommended Action", value: d.recommended_action },
                      { label: "Confidence", value: d.confidence_label },
                      { label: "Support Level", value: d.support_level },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[#64748B] mb-0.5">{label}</p>
                        <p className={`font-semibold capitalize ${THREAT_COLORS[value ?? "none"] ?? "text-[#F4F7FB]"}`}>
                          {(value ?? "—").replace(/_/g, " ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reasoning */}
                {d.reasoning_summary && (
                  <p className="text-xs text-[#9AA7B8] border-t border-[#243044] pt-3 leading-relaxed">
                    {d.reasoning_summary}
                  </p>
                )}

                {/* Evidence hash + explorer links */}
                <div className="flex items-center gap-4 border-t border-[#243044] pt-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#64748B]">
                    <span>Evidence</span>
                    <code className="font-mono-gl text-[#38BDF8]">{truncateHash(d.evidence_hash, 8)}</code>
                  </div>
                  <div className="flex items-center gap-3 ml-auto">
                    {d.tx_hash && (
                      <a
                        href={d.explorer_url ?? `${EXPLORER_BASE}/tx/${d.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-[#8B5CF6] hover:text-[#a78bfa]"
                      >
                        <ExternalLink className="w-3 h-3" /> Submit tx
                      </a>
                    )}
                    {incident && (
                      <Link href={`/app/incidents/${incident.id}`}
                        className="flex items-center gap-1 text-[10px] text-[#38BDF8] hover:text-[#7DD3FC]">
                        View incident →
                      </Link>
                    )}
                  </div>
                </div>

                {/* Pending indicator */}
                {d.consensus_status === "pending" && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#1a1500] border border-[#EAB308]/20 text-xs text-[#EAB308]">
                    <Clock className="w-3.5 h-3.5" />
                    Awaiting adjudication — go to the{" "}
                    <Link href={`/app/incidents/${incident?.id}`} className="underline">incident page</Link>
                    {" "}to request AI consensus.
                  </div>
                )}

                {/* Alert for adjudicated not yet synced */}
                {d.consensus_status === "adjudicated" && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#100820] border border-[#8B5CF6]/20 text-xs text-[#8B5CF6]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Adjudicated but not yet synced — go to the{" "}
                    <Link href={`/app/incidents/${incident?.id}`} className="underline">incident page</Link>
                    {" "}and click Sync Decision.
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

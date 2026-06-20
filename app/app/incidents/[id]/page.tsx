import { redirect, notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { updateIncidentStatus } from "@/lib/signals/actions";
import { ThreatLevelBadge } from "@/components/ui/Badge";
import { AlertTriangle, Cpu, Shield, ExternalLink, Hash, CheckCircle } from "lucide-react";
import { GenLayerIncidentPanel } from "@/components/genlayer/GenLayerIncidentPanel";
import Link from "next/link";
import { formatTimeAgo, truncateHash } from "@/lib/utils";

export const metadata = { title: "Incident — Guardian Layer" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string }>;
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  open:             ["under_review", "dismissed"],
  under_review:     ["genlayer_pending", "resolved", "dismissed"],
  genlayer_pending: ["resolved"],
  resolved:         [],
  dismissed:        [],
};

const STATUS_COLORS: Record<string, string> = {
  open:             "text-[#EF4444] bg-[#2a0a0a] border-[#EF4444]/20",
  under_review:     "text-[#EAB308] bg-[#1a1500] border-[#EAB308]/20",
  genlayer_pending: "text-[#8B5CF6] bg-[#100820] border-[#8B5CF6]/20",
  resolved:         "text-[#22C55E] bg-[#14261a] border-[#22C55E]/20",
  dismissed:        "text-[#64748B] bg-[#0f1218] border-[#243044]",
};

export default async function IncidentDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { updated } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = await createServiceClient();
  const membershipResult = await service
    .from("organisation_members")
    .select("organisation_id, role")
    .eq("user_id", user.id).limit(1).maybeSingle();
  const membership = membershipResult.data as { organisation_id: string; role: string } | null;
  if (!membership?.organisation_id) redirect("/onboarding");

  const { data: rawIncident } = await service
    .from("incidents")
    .select("*, protocols(id, name, chain, network)")
    .eq("id", id)
    .eq("organisation_id", membership.organisation_id)
    .maybeSingle();

  if (!rawIncident) notFound();
  const inc = rawIncident as Record<string, unknown>;
  const protocol = inc.protocols as { id: string; name: string; chain: string; network: string } | null;

  const [evidenceRes, signalsRes, decisionRes] = await Promise.all([
    service.from("evidence_packets").select("evidence_hash, canonical_payload, created_at").eq("incident_id", id).maybeSingle(),
    service.from("incident_signals").select("signal_id, signals(id, title, signal_type, severity_hint, created_at)").eq("incident_id", id),
    inc.genlayer_decision_id
      ? service.from("genlayer_decisions").select("*").eq("id", inc.genlayer_decision_id as string).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const evidencePacket = evidenceRes.data as { evidence_hash: string; canonical_payload: string; created_at: string } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkedSignals = (signalsRes.data ?? []) as Array<{ signal_id: string; signals: any }>;
  const decision = decisionRes.data as Record<string, unknown> | null;

  const canManage = ["owner", "admin", "security_analyst"].includes(membership.role);
  const nextStatuses = STATUS_TRANSITIONS[inc.status as string] ?? [];

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {updated && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[10px] bg-[#0f2a1a] border border-[#22C55E]/30 text-sm text-[#22C55E]">
          <CheckCircle className="w-4 h-4" /> Incident status updated.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-[12px] border flex items-center justify-center flex-shrink-0 ${
          inc.threat_level === "critical" ? "bg-[#2a0a0a] border-[#EF4444]/30" :
          inc.threat_level === "high" ? "bg-[#1a1000] border-[#F97316]/30" :
          "bg-[#1a1500] border-[#EAB308]/20"
        }`}>
          <AlertTriangle className={`w-6 h-6 ${
            inc.threat_level === "critical" ? "text-[#EF4444]" :
            inc.threat_level === "high" ? "text-[#F97316]" : "text-[#EAB308]"
          }`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[inc.status as string] ?? STATUS_COLORS.open}`}>
              {(inc.status as string).replace(/_/g, " ")}
            </span>
            <ThreatLevelBadge level={inc.threat_level as "none" | "low" | "elevated" | "high" | "critical"} />
            <code className="text-[10px] font-mono-gl text-[#64748B]">{inc.incident_key as string}</code>
          </div>
          <h1 className="text-xl font-bold font-display text-[#F4F7FB]">{inc.title as string}</h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
            {protocol && (
              <Link href={`/app/protocols/${protocol.id}`} className="text-[#38BDF8] hover:underline">{protocol.name}</Link>
            )}
            <span>·</span>
            <span>{formatTimeAgo(inc.created_at as string)}</span>
            <span>·</span>
            <span>{inc.source_count as number} source{(inc.source_count as number) !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="command-panel p-5">
        <p className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider mb-3">Summary</p>
        <p className="text-sm text-[#F4F7FB] whitespace-pre-wrap leading-relaxed">{inc.summary as string}</p>
      </div>

      {/* Evidence packet (Stage 7) */}
      {evidencePacket && (
        <div className="command-panel p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-[#38BDF8]" />
            <p className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Evidence Packet</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <span className="text-xs text-[#64748B] w-28 flex-shrink-0 pt-0.5">SHA-256 Hash</span>
              <code className="text-xs font-mono-gl text-[#38BDF8] break-all">{evidencePacket.evidence_hash}</code>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs text-[#64748B] w-28 flex-shrink-0 pt-0.5">Built</span>
              <span className="text-xs text-[#9AA7B8]">{formatTimeAgo(evidencePacket.created_at)}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs text-[#64748B] w-28 flex-shrink-0 pt-0.5">Canonical JSON</span>
              <code className="text-[10px] font-mono-gl text-[#64748B] break-all leading-relaxed">
                {evidencePacket.canonical_payload.slice(0, 200)}…
              </code>
            </div>
          </div>
          <p className="text-[11px] text-[#64748B]">
            This hash is submitted to the GenLayer contract as the immutable evidence reference. It cannot be altered post-creation.
          </p>
        </div>
      )}

      {/* GenLayer decision */}
      {decision ? (
        <div className="command-panel p-5 flex flex-col gap-4 border-[#8B5CF6]/20 bg-[#100820]/30">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#8B5CF6]" />
            <p className="text-sm font-semibold text-[#F4F7FB]">GenLayer Consensus Decision</p>
            <span className={`ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              decision.consensus_status === "finalized"
                ? "text-[#8B5CF6] bg-[#100820] border-[#8B5CF6]/30"
                : "text-[#64748B] bg-[#0f1218] border-[#243044]"
            }`}>{decision.consensus_status as string}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            {[
              { label: "Threat Level", value: decision.threat_level as string ?? "—" },
              { label: "Recommended Action", value: decision.recommended_action as string ?? "—" },
              { label: "Confidence", value: decision.confidence_label as string ?? "—" },
              { label: "Support Level", value: decision.support_level as string ?? "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[#64748B] mb-0.5">{label}</p>
                <p className="font-medium text-[#F4F7FB] capitalize">{value.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
          {(decision.reasoning_summary as string | null) && (
            <div>
              <p className="text-xs text-[#64748B] mb-1">Reasoning</p>
              <p className="text-sm text-[#9AA7B8]">{decision.reasoning_summary as string}</p>
            </div>
          )}
          {(decision.explorer_url as string | null) && (
            <a
              href={decision.explorer_url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#8B5CF6] hover:text-[#a78bfa] self-start"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View on GenLayer Explorer
            </a>
          )}
          <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#8B5CF6]/10 text-[11px] text-[#64748B]">
            <Shield className="w-3.5 h-3.5 text-[#8B5CF6] mt-0.5 flex-shrink-0" />
            Source of truth: <span className="text-[#8B5CF6] font-medium ml-1">{decision.source_of_truth as string}</span>
          </div>
        </div>
      ) : (
        canManage && (
          <GenLayerIncidentPanel
            incidentId={id}
            incidentKey={inc.incident_key as string}
            genlayerTxHash={(inc.genlayer_tx_hash as string | null) ?? null}
            decisionId={(inc.genlayer_decision_id as string | null) ?? null}
            decisionStatus={(decision ? (decision["consensus_status"] as string) : null)}
          />
        )
      )}

      {/* Linked signals */}
      {linkedSignals.length > 0 && (
        <div className="command-panel p-5 flex flex-col gap-3">
          <p className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Source Signals</p>
          {linkedSignals.map(ls => {
            const s = ls.signals;
            if (!s) return null;
            return (
              <Link
                key={ls.signal_id}
                href={`/app/signals/${ls.signal_id}`}
                className="flex items-center gap-3 p-3 rounded-[8px] bg-[#070A12] border border-[#243044] hover:border-[#38BDF8]/30 transition-colors"
              >
                <code className="text-[10px] font-mono-gl text-[#64748B]">{truncateHash(ls.signal_id, 6)}</code>
                <span className="flex-1 text-sm text-[#F4F7FB] truncate">{s.title as string}</span>
                <span className="text-xs text-[#64748B]">{s.signal_type as string}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Status transitions */}
      {canManage && nextStatuses.length > 0 && (
        <div className="command-panel p-5 flex flex-col gap-3">
          <p className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Update Status</p>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map(status => (
              <form key={status} action={updateIncidentStatus}>
                <input type="hidden" name="incident_id" value={id} />
                <input type="hidden" name="status" value={status} />
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-[7px] text-xs font-medium border transition-colors ${STATUS_COLORS[status] ?? "text-[#9AA7B8] border-[#243044]"} hover:opacity-80`}
                >
                  Mark as {status.replace(/_/g, " ")}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { redirect, notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { escalateToIncident } from "@/lib/signals/actions";
import { Radio, ExternalLink, ArrowUpRight, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { formatTimeAgo, truncateHash } from "@/lib/utils";

export const metadata = { title: "Signal - Guardian Layer" };

type Props = { params: Promise<{ id: string }> };

const THREAT_OPTIONS = ["elevated", "high", "critical"];

export default async function SignalDetailPage({ params }: Props) {
  const { id } = await params;

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

  const { data: rawSignal } = await service
    .from("signals")
    .select("*, protocols(id, name, chain, network)")
    .eq("id", id)
    .eq("organisation_id", membership.organisation_id)
    .maybeSingle();

  if (!rawSignal) notFound();
  const signal = rawSignal as Record<string, unknown>;
  const protocol = signal.protocols as { id: string; name: string; chain: string; network: string } | null;

  const canEscalate = ["owner", "admin", "security_analyst"].includes(membership.role)
    && signal.status === "new";

  const txHashes = (signal.tx_hashes as string[]) ?? [];
  const affectedContracts = (signal.affected_contracts as string[]) ?? [];
  const evidenceUrls = (signal.evidence_urls as string[]) ?? [];

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-[#1a1500] border border-[#EAB308]/20 flex items-center justify-center flex-shrink-0">
          <Radio className="w-5 h-5 text-[#EAB308]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono-gl text-[#64748B]">Signal</span>
            <span className="text-xs text-[#243044]">·</span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              signal.severity_hint === "critical" ? "text-[#EF4444] bg-[#2a0a0a] border-[#EF4444]/20" :
              signal.severity_hint === "high" ? "text-[#F97316] bg-[#1a1000] border-[#F97316]/20" :
              signal.severity_hint === "medium" ? "text-[#EAB308] bg-[#1a1500] border-[#EAB308]/20" :
              "text-[#38BDF8] bg-[#061620] border-[#38BDF8]/20"
            }`}>{signal.severity_hint as string}</span>
            <span className="text-xs text-[#64748B] font-mono-gl">{(signal.signal_type as string).replace(/_/g, " ")}</span>
          </div>
          <h1 className="text-xl font-bold font-display text-[#F4F7FB] mt-1">{signal.title as string}</h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
            {protocol && (
              <Link href={`/app/protocols/${protocol.id}`} className="text-[#38BDF8] hover:underline">
                {protocol.name}
              </Link>
            )}
            <span>·</span>
            <span>{formatTimeAgo(signal.created_at as string)}</span>
            <span>·</span>
            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${
              signal.status === "incident_created" ? "text-[#F97316] bg-[#1a1000] border-[#F97316]/20" :
              signal.status === "new" ? "text-[#38BDF8] bg-[#061620] border-[#38BDF8]/20" :
              "text-[#64748B] bg-[#0f1218] border-[#243044]"
            }`}>{(signal.status as string).replace(/_/g, " ")}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="command-panel p-5">
        <p className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider mb-3">Summary</p>
        <p className="text-sm text-[#F4F7FB] whitespace-pre-wrap leading-relaxed">{signal.summary as string}</p>
      </div>

      {/* On-chain evidence */}
      {(txHashes.length > 0 || affectedContracts.length > 0 || evidenceUrls.length > 0) && (
        <div className="command-panel p-5 flex flex-col gap-4">
          <p className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">On-Chain Evidence</p>

          {txHashes.length > 0 && (
            <div>
              <p className="text-xs text-[#64748B] mb-2">Transaction Hashes</p>
              <div className="flex flex-col gap-1.5">
                {txHashes.map(h => (
                  <div key={h} className="flex items-center gap-2 px-3 py-2 rounded-[7px] bg-[#070A12] border border-[#243044]">
                    <code className="flex-1 text-xs font-mono-gl text-[#9AA7B8]">{truncateHash(h, 12)}</code>
                    <span
                      className="text-[10px] font-mono-gl text-[#64748B] hover:text-[#F4F7FB] transition-colors"
                      title={h}
                    >
                      {h}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {affectedContracts.length > 0 && (
            <div>
              <p className="text-xs text-[#64748B] mb-2">Affected Contracts</p>
              <div className="flex flex-wrap gap-2">
                {affectedContracts.map(addr => (
                  <code key={addr} className="text-xs font-mono-gl text-[#9AA7B8] bg-[#070A12] border border-[#243044] px-2 py-1 rounded">
                    {addr}
                  </code>
                ))}
              </div>
            </div>
          )}

          {evidenceUrls.length > 0 && (
            <div>
              <p className="text-xs text-[#64748B] mb-2">Evidence URLs</p>
              <div className="flex flex-col gap-1">
                {evidenceUrls.map(url => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#38BDF8] hover:text-[#7DD3FC] transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Escalate to incident */}
      {canEscalate && (
        <div className="command-panel p-5 flex flex-col gap-4 border-[#8B5CF6]/20">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#8B5CF6]" />
            <p className="text-sm font-semibold text-[#F4F7FB]">Escalate to Incident</p>
          </div>
          <p className="text-xs text-[#64748B]">
            Creates a formal incident record, builds an evidence packet with a SHA-256 canonical hash, and prepares it for GenLayer adjudication.
          </p>

          <form action={escalateToIncident} className="flex flex-col gap-4">
            <input type="hidden" name="signal_id" value={id} />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Incident Title *</label>
              <input
                name="title"
                required
                defaultValue={signal.title as string}
                className="px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#8B5CF6]/50 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Incident Summary *</label>
              <textarea
                name="summary"
                required
                rows={3}
                defaultValue={signal.summary as string}
                className="px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#8B5CF6]/50 transition-colors resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Initial Threat Level</label>
              <select
                name="threat_level"
                defaultValue="elevated"
                className="px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#8B5CF6]/50 appearance-none"
              >
                {THREAT_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 self-start px-5 py-2.5 rounded-[8px] bg-[#8B5CF6] text-white font-bold text-sm hover:bg-[#a78bfa] transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" /> Escalate to Incident
            </button>
          </form>
        </div>
      )}

      {signal.status === "incident_created" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[10px] bg-[#1a1000] border border-[#F97316]/20 text-sm text-[#F97316]">
          This signal has been escalated to an incident.{" "}
          <Link href="/app/incidents" className="underline hover:text-[#fdba74]">View incidents →</Link>
        </div>
      )}
    </div>
  );
}

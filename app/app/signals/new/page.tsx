import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { submitSignal } from "@/lib/signals/actions";
import { Radio, ShieldAlert } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Submit Signal - Guardian Layer" };

const SIGNAL_TYPES = [
  "large_outflow", "abnormal_withdrawal", "admin_wallet_change", "ownership_transfer",
  "pause_state_change", "contract_upgrade", "suspicious_approval", "bridge_drain_pattern",
  "security_report", "public_exploit_claim", "github_advisory",
  "oracle_manipulation", "flash_loan_attack", "reentrancy", "governance_attack",
  "price_manipulation", "rugpull", "exploit_attempt",
  "api_submitted", "manual_report", "integration_compromise", "unknown", "other",
];

const SEVERITY_LEVELS = ["low", "elevated", "medium", "high", "critical"];

export default async function NewSignalPage() {
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

  if (!["owner", "admin", "security_analyst"].includes(membership.role)) redirect("/app/signals");

  const { data: rawProtocols } = await service
    .from("protocols")
    .select("id, name, chain, network")
    .eq("organisation_id", membership.organisation_id)
    .eq("current_status", "monitoring")
    .order("name");

  const protocols = (rawProtocols ?? []) as Array<{ id: string; name: string; chain: string; network: string }>;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Radio className="w-5 h-5 text-[#EAB308]" />
          <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">Submit Signal</h1>
        </div>
        <p className="text-sm text-[#64748B]">
          Report a suspicious event or exploit indicator for a monitored protocol. Signals can be escalated to incidents for GenLayer adjudication.
        </p>
      </div>

      {/* Injection guard notice */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-[10px] bg-[#100820] border border-[#8B5CF6]/20 text-xs text-[#9AA7B8]">
        <ShieldAlert className="w-4 h-4 text-[#8B5CF6] flex-shrink-0 mt-0.5" />
        <span>
          Verdict fields (<code className="font-mono-gl">threat_level</code>, <code className="font-mono-gl">recommended_action</code>, <code className="font-mono-gl">confidence_label</code>) are set exclusively by GenLayer consensus. They cannot be submitted here or via API.
        </span>
      </div>

      {protocols.length === 0 ? (
        <div className="command-panel p-8 text-center">
          <p className="text-sm text-[#64748B] mb-3">No protocols in monitoring state. Register a protocol first.</p>
          <Link href="/app/protocols/new" className="text-[#38BDF8] text-sm hover:underline">Register Protocol →</Link>
        </div>
      ) : (
        <form action={submitSignal} className="command-panel p-6 flex flex-col gap-5">
          {/* Protocol */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Protocol *</label>
            <select
              name="protocol_id"
              required
              className="px-3 py-2.5 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#EAB308]/50 appearance-none"
            >
              <option value="">Select protocol…</option>
              {protocols.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.chain}/{p.network})</option>
              ))}
            </select>
          </div>

          {/* Signal type + severity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Signal Type *</label>
              <select
                name="signal_type"
                required
                className="px-3 py-2.5 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#EAB308]/50 appearance-none"
              >
                {SIGNAL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Severity Hint *</label>
              <select
                name="severity_hint"
                defaultValue="medium"
                className="px-3 py-2.5 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#EAB308]/50 appearance-none"
              >
                {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Title *</label>
            <input
              name="title"
              required
              maxLength={200}
              placeholder="Brief description of the suspicious event…"
              className="px-3 py-2.5 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] placeholder:text-[#374151] focus:outline-none focus:border-[#EAB308]/50 transition-colors"
            />
          </div>

          {/* Summary */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Summary *</label>
            <textarea
              name="summary"
              required
              rows={4}
              placeholder="Describe what was observed, what contracts or wallets are involved, and why this is suspicious…"
              className="px-3 py-2.5 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] placeholder:text-[#374151] focus:outline-none focus:border-[#EAB308]/50 transition-colors resize-none"
            />
          </div>

          {/* On-chain evidence */}
          <div className="flex flex-col gap-3 p-4 rounded-[10px] bg-[#070A12] border border-[#243044]">
            <p className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">On-Chain Evidence</p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#64748B]">Transaction hashes (one per line)</label>
              <textarea
                name="tx_hashes"
                rows={2}
                placeholder={"0xabc123…\n0xdef456…"}
                className="px-3 py-2 rounded-[8px] bg-[#0D111C] border border-[#243044] text-xs font-mono-gl text-[#F4F7FB] placeholder:text-[#374151] focus:outline-none focus:border-[#EAB308]/50 transition-colors resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#64748B]">Affected contract addresses (one per line)</label>
              <textarea
                name="affected_contracts"
                rows={2}
                placeholder={"0xContract1…\n0xContract2…"}
                className="px-3 py-2 rounded-[8px] bg-[#0D111C] border border-[#243044] text-xs font-mono-gl text-[#F4F7FB] placeholder:text-[#374151] focus:outline-none focus:border-[#EAB308]/50 transition-colors resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#64748B]">Evidence URLs (one per line - block explorers, reports, etc.)</label>
              <textarea
                name="evidence_urls"
                rows={2}
                placeholder={"https://etherscan.io/tx/…\nhttps://…"}
                className="px-3 py-2 rounded-[8px] bg-[#0D111C] border border-[#243044] text-xs font-mono-gl text-[#F4F7FB] placeholder:text-[#374151] focus:outline-none focus:border-[#EAB308]/50 transition-colors resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1 border-t border-[#243044]">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-[8px] bg-[#EAB308] text-[#070A12] font-bold text-sm hover:bg-[#fbbf24] transition-colors"
            >
              Submit Signal
            </button>
            <Link href="/app/signals" className="px-5 py-2.5 rounded-[8px] bg-[#121827] text-[#9AA7B8] text-sm hover:bg-[#1e2a3a] transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

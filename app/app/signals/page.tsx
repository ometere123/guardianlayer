import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Radio, Plus, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatTimeAgo } from "@/lib/utils";

export const metadata = { title: "Signals - Guardian Layer" };

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-[#EF4444] bg-[#2a0a0a] border-[#EF4444]/20",
  high:     "text-[#F97316] bg-[#1a1000] border-[#F97316]/20",
  medium:   "text-[#EAB308] bg-[#1a1500] border-[#EAB308]/20",
  low:      "text-[#38BDF8] bg-[#061620] border-[#38BDF8]/20",
};

const STATUS_COLORS: Record<string, string> = {
  new:              "text-[#38BDF8] bg-[#061620] border-[#38BDF8]/20",
  triaged:          "text-[#8B5CF6] bg-[#100820] border-[#8B5CF6]/20",
  incident_created: "text-[#F97316] bg-[#1a1000] border-[#F97316]/20",
  dismissed:        "text-[#64748B] bg-[#0f1218] border-[#243044]",
  duplicate:        "text-[#64748B] bg-[#0f1218] border-[#243044]",
  expired:          "text-[#64748B] bg-[#0f1218] border-[#243044]",
};

export default async function SignalsPage() {
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

  const { data: rawSignals } = await service
    .from("signals")
    .select("id, title, signal_type, severity_hint, status, protocol_id, created_at, protocols(name)")
    .eq("organisation_id", membership.organisation_id)
    .order("created_at", { ascending: false })
    .limit(100);

  const signals = ((rawSignals ?? []) as unknown) as Array<{
    id: string; title: string; signal_type: string; severity_hint: string;
    status: string; protocol_id: string; created_at: string;
    protocols: { name: string } | null;
  }>;

  const canSubmit = ["owner", "admin", "security_analyst"].includes(membership.role);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-5 h-5 text-[#EAB308]" />
            <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">Signal Feed</h1>
          </div>
          <p className="text-sm text-[#64748B]">{signals.length} signal{signals.length !== 1 ? "s" : ""} received</p>
        </div>
        {canSubmit && (
          <Link href="/app/signals/new" className="flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#EAB308] text-[#070A12] text-sm font-bold hover:bg-[#fbbf24] transition-colors">
            <Plus className="w-4 h-4" /> Submit Signal
          </Link>
        )}
      </div>

      {signals.length === 0 ? (
        <div className="command-panel p-12 flex flex-col items-center gap-4 text-center">
          <Radio className="w-8 h-8 text-[#243044]" />
          <div>
            <p className="text-[#F4F7FB] font-semibold mb-1">No signals yet</p>
            <p className="text-sm text-[#64748B]">Signals arrive via dashboard submission or the <code className="font-mono-gl">POST /api/v1/signals</code> endpoint.</p>
          </div>
        </div>
      ) : (
        <div className="command-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#243044]">
                {["Signal", "Type", "Severity", "Protocol", "Status", "Received"].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-wider px-5 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signals.map(s => (
                <tr key={s.id} className="border-b border-[#243044]/50 hover:bg-[#121827]/50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/app/signals/${s.id}`} className="font-medium text-[#F4F7FB] hover:text-[#38BDF8] transition-colors line-clamp-1">
                      {s.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-xs font-mono-gl text-[#9AA7B8]">{s.signal_type}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[s.severity_hint] ?? SEVERITY_COLORS.low}`}>
                      {s.severity_hint}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-[#9AA7B8]">{s.protocols?.name ?? "-"}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[s.status] ?? STATUS_COLORS.new}`}>
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-[#64748B]">{formatTimeAgo(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-start gap-3 px-4 py-3 rounded-[10px] bg-[#0D111C] border border-[#243044] text-xs text-[#64748B]">
        <AlertTriangle className="w-4 h-4 text-[#EAB308] flex-shrink-0 mt-0.5" />
        <span>
          Signals can also be submitted via API: <code className="font-mono-gl text-[#9AA7B8]">POST /api/v1/signals</code> with scope <code className="font-mono-gl text-[#9AA7B8]">signals:write</code>.
          Verdict fields (<code className="font-mono-gl">threat_level</code>, <code className="font-mono-gl">recommended_action</code>, etc.) are always rejected - GenLayer is the sole verdict authority.
        </span>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ThreatLevelBadge } from "@/components/ui/Badge";
import { AlertTriangle, Cpu } from "lucide-react";
import Link from "next/link";
import { formatTimeAgo } from "@/lib/utils";

export const metadata = { title: "Incidents - Guardian Layer" };

const STATUS_COLORS: Record<string, string> = {
  open:             "text-[#EF4444] bg-[#2a0a0a] border-[#EF4444]/20",
  under_review:     "text-[#EAB308] bg-[#1a1500] border-[#EAB308]/20",
  genlayer_pending: "text-[#8B5CF6] bg-[#100820] border-[#8B5CF6]/20",
  resolved:         "text-[#22C55E] bg-[#14261a] border-[#22C55E]/20",
  dismissed:        "text-[#64748B] bg-[#0f1218] border-[#243044]",
};

export default async function IncidentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = await createServiceClient();
  const membershipResult = await service
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id).limit(1).maybeSingle();
  const membership = membershipResult.data as { organisation_id: string } | null;
  if (!membership?.organisation_id) redirect("/onboarding");

  const { data: rawIncidents } = await service
    .from("incidents")
    .select("id, incident_key, title, status, threat_level, confidence_label, source_count, genlayer_decision_id, created_at, protocols(name)")
    .eq("organisation_id", membership.organisation_id)
    .order("created_at", { ascending: false })
    .limit(100);

  const incidents = ((rawIncidents ?? []) as unknown) as Array<{
    id: string; incident_key: string; title: string; status: string;
    threat_level: string; confidence_label: string; source_count: number;
    genlayer_decision_id: string | null; created_at: string;
    protocols: { name: string } | null;
  }>;

  const openCount = incidents.filter(i => i.status === "open" || i.status === "under_review").length;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-[#F97316]" />
            <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">Incidents</h1>
          </div>
          <p className="text-sm text-[#64748B]">
            {openCount > 0 ? (
              <span className="text-[#F97316] font-medium">{openCount} open</span>
            ) : (
              <span className="text-[#22C55E]">No open incidents</span>
            )}
            {" "}· {incidents.length} total
          </p>
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="command-panel p-12 flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="w-8 h-8 text-[#243044]" />
          <div>
            <p className="text-[#F4F7FB] font-semibold mb-1">No incidents yet</p>
            <p className="text-sm text-[#64748B]">Incidents are created by escalating signals from the Signal Feed.</p>
          </div>
          <Link href="/app/signals" className="text-[#EAB308] text-sm hover:underline">Go to Signal Feed →</Link>
        </div>
      ) : (
        <div className="command-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#243044]">
                {["Incident", "Protocol", "Threat", "Status", "Sources", "GenLayer", "Created"].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-wider px-5 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.map(inc => (
                <tr key={inc.id} className="border-b border-[#243044]/50 hover:bg-[#121827]/50 transition-colors">
                  <td className="px-5 py-3 max-w-xs">
                    <Link href={`/app/incidents/${inc.id}`} className="font-medium text-[#F4F7FB] hover:text-[#38BDF8] transition-colors line-clamp-1 block">
                      {inc.title}
                    </Link>
                    <code className="text-[10px] font-mono-gl text-[#64748B]">{inc.incident_key}</code>
                  </td>
                  <td className="px-5 py-3 text-xs text-[#9AA7B8]">{inc.protocols?.name ?? "-"}</td>
                  <td className="px-5 py-3">
                    <ThreatLevelBadge level={inc.threat_level as "none" | "low" | "elevated" | "high" | "critical"} />
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[inc.status] ?? STATUS_COLORS.open}`}>
                      {inc.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-[#64748B]">{inc.source_count}</td>
                  <td className="px-5 py-3">
                    {inc.genlayer_decision_id ? (
                      <span className="flex items-center gap-1 text-xs text-[#8B5CF6]">
                        <Cpu className="w-3 h-3" /> Decided
                      </span>
                    ) : (
                      <span className="text-xs text-[#64748B]">Pending</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-[#64748B]">{formatTimeAgo(inc.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ThreatLevelBadge, ProtocolStatusBadge } from "@/components/ui/Badge";
import { Shield, Plus, AlertTriangle, Activity } from "lucide-react";
import Link from "next/link";
import { formatTimeAgo } from "@/lib/utils";

export const metadata = { title: "Protocol Registry — Guardian Layer" };

export default async function ProtocolsPage() {
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

  const { data: rawProtocols } = await service
    .from("protocols")
    .select("id, name, slug, category, chain, network, current_status, current_threat_level, emergency_mode, last_signal_at, created_at")
    .eq("organisation_id", membership.organisation_id)
    .order("created_at", { ascending: false });

  const protocols = (rawProtocols ?? []) as Array<{
    id: string; name: string; slug: string; category: string;
    chain: string; network: string; current_status: string;
    current_threat_level: string; emergency_mode: string;
    last_signal_at: string | null; created_at: string;
  }>;

  const canManage = ["owner", "admin"].includes(membership.role);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">Protocol Registry</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {protocols.length} protocol{protocols.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        {canManage && (
          <Link
            href="/app/protocols/new"
            className="flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#38BDF8] text-[#070A12] text-sm font-bold hover:bg-[#7DD3FC] transition-colors"
          >
            <Plus className="w-4 h-4" /> Register Protocol
          </Link>
        )}
      </div>

      {protocols.length === 0 ? (
        <div className="command-panel p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-[#121827] flex items-center justify-center">
            <Shield className="w-7 h-7 text-[#243044]" />
          </div>
          <div>
            <p className="text-[#F4F7FB] font-semibold mb-1">No protocols registered</p>
            <p className="text-sm text-[#64748B]">Register your first protocol to begin monitoring exploit signals and receiving GenLayer verdicts.</p>
          </div>
          {canManage && (
            <Link
              href="/app/protocols/new"
              className="mt-2 px-5 py-2.5 rounded-[8px] bg-[#38BDF8] text-[#070A12] font-bold text-sm hover:bg-[#7DD3FC] transition-colors"
            >
              Register Protocol
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {protocols.map(p => (
            <Link
              key={p.id}
              href={`/app/protocols/${p.id}`}
              className="command-panel p-5 hover:border-[#38BDF8]/30 transition-colors flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-[10px] bg-[#121827] flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-[#38BDF8]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[#F4F7FB]">{p.name}</span>
                  <span className="text-[10px] text-[#64748B] bg-[#121827] px-2 py-0.5 rounded-full capitalize">{p.category}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#64748B]">
                  <span className="font-mono-gl">{p.chain}/{p.network}</span>
                  <span>·</span>
                  <span className="uppercase">{p.emergency_mode.replace(/_/g, " ")}</span>
                  {p.last_signal_at && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{formatTimeAgo(p.last_signal_at)}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <ThreatLevelBadge level={p.current_threat_level as "none" | "low" | "elevated" | "high" | "critical"} />
                <ProtocolStatusBadge status={p.current_status as "normal" | "monitoring" | "under_review" | "pause_recommended" | "paused" | "disabled"} />
              </div>

              {p.current_threat_level === "critical" && (
                <AlertTriangle className="w-4 h-4 text-[#EF4444] animate-pulse flex-shrink-0" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ScrollText, User, Key, Activity } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

export const metadata = { title: "Audit Log — Guardian Layer" };

const ACTION_ICON: Record<string, string> = {
  "protocol.created":             "🛡",
  "protocol.genlayer_registered": "🔗",
  "incident.created":             "🚨",
  "incident.genlayer_submitted":  "📤",
  "incident.genlayer_adjudicated":"🤖",
  "incident.genlayer_synced":     "✅",
  "incident.status_changed":      "↕",
  "signal.submitted":             "📡",
  "contract.added":               "📄",
  "pause_policy.updated":         "⚙",
  "webhook.created":              "🔔",
  "webhook.deleted":              "🗑",
};

export default async function AuditLogsPage() {
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

  if (!["owner", "admin"].includes(membership.role)) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">Audit Log</h1>
        <p className="text-sm text-[#64748B]">Only owners and admins can view audit logs.</p>
      </div>
    );
  }

  const { data: rawLogs } = await service
    .from("audit_logs")
    .select("id, action, target_type, target_id, metadata_json, actor_user_id, actor_api_key_id, created_at")
    .eq("organisation_id", membership.organisation_id)
    .order("created_at", { ascending: false })
    .limit(200);

  const logs = (rawLogs ?? []) as Array<{
    id: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    metadata_json: Record<string, unknown> | null;
    actor_user_id: string | null;
    actor_api_key_id: string | null;
    created_at: string;
  }>;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">Audit Log</h1>
        <p className="text-sm text-[#64748B] mt-0.5">Immutable record of all actions in your organisation.</p>
      </div>

      <div className="command-panel overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-10 text-center">
            <ScrollText className="w-8 h-8 text-[#243044] mx-auto mb-3" />
            <p className="text-sm text-[#64748B]">No audit events yet.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[#243044]/50">
            {logs.map(log => {
              const icon = ACTION_ICON[log.action] ?? "•";
              const actor = log.actor_api_key_id
                ? "API Key"
                : log.actor_user_id
                  ? `User ${log.actor_user_id.slice(0, 8)}…`
                  : "System";

              return (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-[#080C16] transition-colors">
                  <span className="text-base w-6 text-center flex-shrink-0 mt-0.5">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono-gl text-[#38BDF8]">{log.action}</code>
                      {log.target_type && (
                        <span className="text-[10px] text-[#64748B]">{log.target_type}</span>
                      )}
                    </div>
                    {log.metadata_json && Object.keys(log.metadata_json).length > 0 && (
                      <p className="text-[10px] text-[#64748B] mt-0.5 truncate font-mono-gl">
                        {JSON.stringify(log.metadata_json).slice(0, 120)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[#64748B]">
                      {log.actor_api_key_id ? (
                        <span className="flex items-center gap-1"><Key className="w-3 h-3" /> {actor}</span>
                      ) : (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {actor}</span>
                      )}
                      <span>·</span>
                      <span>{formatTimeAgo(log.created_at)}</span>
                    </div>
                  </div>
                  <Activity className="w-3.5 h-3.5 text-[#243044] flex-shrink-0 mt-1" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

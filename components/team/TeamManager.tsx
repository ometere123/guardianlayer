"use client";

import { useState } from "react";
import { Users, Mail, Trash2, ChevronDown, Loader2, CheckCircle, Clock, Shield } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

const ROLES = ["admin", "security_analyst", "viewer"] as const;
type InviteRole = typeof ROLES[number];

const ROLE_LABELS: Record<string, string> = {
  owner:            "Owner",
  admin:            "Admin",
  security_analyst: "Security Analyst",
  viewer:           "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  owner:            "text-[#F4F7FB] border-[#38BDF8]/30 bg-[#0a1929]",
  admin:            "text-[#8B5CF6] border-[#8B5CF6]/20 bg-[#100820]",
  security_analyst: "text-[#EAB308] border-[#EAB308]/20 bg-[#1a1500]",
  viewer:           "text-[#64748B] border-[#243044] bg-[#0f1218]",
};

type Member = {
  id: string; user_id: string; role: string; email: string;
  display_name: string | null; is_self: boolean; created_at: string;
};
type Invitation = {
  id: string; email: string; role: string; status: string; expires_at: string; created_at: string;
};

type Props = {
  members: Member[];
  invitations: Invitation[];
  currentRole: string;
  orgName: string;
  canManage: boolean;
};

export function TeamManager({ members: initialMembers, invitations: initialInvites, orgName, canManage }: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvites);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("security_analyst");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
      });
      const json = await res.json() as { ok?: boolean; method?: string; error?: string };
      if (!res.ok || !json.ok) {
        setInviteError(json.error ?? "Failed to invite");
      } else {
        const msg = json.method === "added_directly"
          ? `${inviteEmail} was added directly (they already have an account).`
          : `Invite email sent to ${inviteEmail}.`;
        setInviteSuccess(msg);
        setInviteEmail("");
        if (json.method === "invite_email_sent") {
          setInvitations(prev => [{
            id: crypto.randomUUID(),
            email: inviteEmail.trim().toLowerCase(),
            role: inviteRole,
            status: "pending",
            expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
            created_at: new Date().toISOString(),
          }, ...prev]);
        }
      }
    } catch (err) {
      setInviteError(String(err));
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    setActionLoading(memberId);
    setActionError(null);
    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setActionError(json.error ?? "Failed to update role");
      } else {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      }
    } catch (err) {
      setActionError(String(err));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this member from the organisation?")) return;
    setActionLoading(memberId);
    setActionError(null);
    try {
      const res = await fetch(`/api/team/members/${memberId}`, { method: "DELETE" });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setActionError(json.error ?? "Failed to remove member");
      } else {
        setMembers(prev => prev.filter(m => m.id !== memberId));
      }
    } catch (err) {
      setActionError(String(err));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    setActionLoading(inviteId);
    try {
      await fetch(`/api/team/invitations/${inviteId}`, { method: "DELETE" });
      setInvitations(prev => prev.filter(i => i.id !== inviteId));
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">Team</h1>
        <p className="text-sm text-[#64748B] mt-0.5">{orgName} · {members.length} member{members.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Invite form */}
      {canManage && (
        <div className="command-panel p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#38BDF8]" />
            <p className="text-sm font-semibold text-[#F4F7FB]">Invite a team member</p>
          </div>
          <div className="flex gap-2">
            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleInvite()}
              placeholder="colleague@example.com"
              type="email"
              className="flex-1 px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8]"
            />
            <div className="relative">
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as InviteRole)}
                className="appearance-none pl-3 pr-8 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#38BDF8]"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B] pointer-events-none" />
            </div>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#38BDF8] text-[#070A12] text-sm font-semibold hover:bg-[#7DD3FC] transition-colors disabled:opacity-50"
            >
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {inviting ? "Sending…" : "Invite"}
            </button>
          </div>
          {inviteSuccess && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#0f2a1a] border border-[#22C55E]/30 text-xs text-[#22C55E]">
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> {inviteSuccess}
            </div>
          )}
          {inviteError && <p className="text-xs text-[#EF4444]">{inviteError}</p>}
          <p className="text-[10px] text-[#64748B]">
            If they don&apos;t have an account yet, they&apos;ll receive an email to set up access. Invitations expire in 7 days.
          </p>
        </div>
      )}

      {actionError && (
        <div className="px-4 py-3 rounded-[10px] bg-[#2a0a0a] border border-[#EF4444]/20 text-sm text-[#EF4444]">
          {actionError}
        </div>
      )}

      {/* Members list */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider flex items-center gap-2">
          <Users className="w-3.5 h-3.5" /> Members ({members.length})
        </h2>
        <div className="command-panel overflow-hidden">
          <div className="flex flex-col divide-y divide-[#243044]/50">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-[#121827] border border-[#243044] flex items-center justify-center flex-shrink-0 text-xs font-medium text-[#9AA7B8]">
                  {(m.display_name ?? m.email)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#F4F7FB] truncate">
                      {m.display_name ?? m.email}
                    </p>
                    {m.is_self && <span className="text-[10px] text-[#64748B]">(you)</span>}
                  </div>
                  <p className="text-xs text-[#64748B] truncate">{m.email}</p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${ROLE_COLORS[m.role] ?? ROLE_COLORS.viewer}`}>
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
                {canManage && m.role !== "owner" && !m.is_self && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="relative">
                      <select
                        defaultValue={m.role}
                        onChange={e => handleRoleChange(m.id, e.target.value)}
                        disabled={actionLoading === m.id}
                        className="appearance-none pl-2 pr-6 py-1 rounded-[6px] bg-[#070A12] border border-[#243044] text-xs text-[#9AA7B8] focus:outline-none focus:border-[#38BDF8] disabled:opacity-50"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#64748B] pointer-events-none" />
                    </div>
                    <button
                      onClick={() => handleRemove(m.id)}
                      disabled={actionLoading === m.id}
                      className="p-1.5 rounded-[6px] text-[#64748B] hover:text-[#EF4444] hover:bg-[#2a0a0a] transition-colors disabled:opacity-50"
                    >
                      {actionLoading === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Pending Invitations ({invitations.length})
          </h2>
          <div className="command-panel overflow-hidden">
            <div className="flex flex-col divide-y divide-[#243044]/50">
              {invitations.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#1a1500] border border-[#EAB308]/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3.5 h-3.5 text-[#EAB308]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#F4F7FB] truncate">{inv.email}</p>
                    <p className="text-xs text-[#64748B]">
                      Expires {formatTimeAgo(inv.expires_at)} · invited {formatTimeAgo(inv.created_at)}
                    </p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${ROLE_COLORS[inv.role] ?? ROLE_COLORS.viewer}`}>
                    {ROLE_LABELS[inv.role] ?? inv.role}
                  </span>
                  {canManage && (
                    <button
                      onClick={() => handleRevokeInvite(inv.id)}
                      disabled={actionLoading === inv.id}
                      className="p-1.5 rounded-[6px] text-[#64748B] hover:text-[#EF4444] hover:bg-[#2a0a0a] transition-colors"
                    >
                      {actionLoading === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Role legend */}
      <div className="command-panel p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" /> Role Permissions
        </p>
        {[
          { role: "owner",            desc: "Full access. Can manage billing, delete the organisation." },
          { role: "admin",            desc: "Can invite members, manage protocols, API keys, and webhooks." },
          { role: "security_analyst", desc: "Can submit signals, escalate incidents, trigger GenLayer adjudication." },
          { role: "viewer",           desc: "Read-only access to all dashboards and decisions." },
        ].map(({ role, desc }) => (
          <div key={role} className="flex items-start gap-3">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${ROLE_COLORS[role]}`}>
              {ROLE_LABELS[role]}
            </span>
            <p className="text-xs text-[#64748B]">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

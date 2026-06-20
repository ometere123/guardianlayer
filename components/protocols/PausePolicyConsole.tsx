"use client";

import { useState } from "react";
import { updatePausePolicy } from "@/lib/protocols/actions";
import { ShieldAlert, Info } from "lucide-react";

type Policy = Record<string, unknown> | null;

type Props = {
  protocolId: string;
  policy: Policy;
  canManage: boolean;
};

const THREAT_LEVELS = ["low", "elevated", "high", "critical"];
const EMERGENCY_MODES = [
  { value: "alert_only", label: "Alert Only", desc: "Guardian monitors and alerts. No automated action." },
  { value: "semi_automatic", label: "Semi-Automatic", desc: "Guardian recommends; human must approve pause." },
  { value: "automatic", label: "Automatic", desc: "GenLayer consensus can trigger pause without human approval." },
];

function Toggle({ name, defaultValue, disabled }: { name: string; defaultValue: boolean; disabled: boolean }) {
  const [on, setOn] = useState(defaultValue);
  return (
    <>
      <input type="hidden" name={name} value={on ? "true" : "false"} />
      <button
        type="button"
        onClick={() => !disabled && setOn(v => !v)}
        className={`relative w-10 h-5 rounded-full transition-colors ${on ? "bg-[#38BDF8]" : "bg-[#243044]"} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
      </button>
    </>
  );
}

export function PausePolicyConsole({ protocolId, policy, canManage }: Props) {
  const p = policy ?? {};
  const [mode, setMode] = useState((p.emergency_mode as string) ?? "alert_only");

  return (
    <form action={updatePausePolicy} className="flex flex-col gap-5">
      <input type="hidden" name="protocol_id" value={protocolId} />
      <input type="hidden" name="emergency_mode" value={mode} />

      {/* Emergency mode selector */}
      <div className="command-panel p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#8B5CF6]" />
          <h2 className="text-sm font-semibold text-[#F4F7FB]">Emergency Mode</h2>
        </div>
        <div className="flex flex-col gap-2">
          {EMERGENCY_MODES.map(em => (
            <label
              key={em.value}
              className={`flex items-start gap-3 p-4 rounded-[10px] border cursor-pointer transition-colors ${
                mode === em.value
                  ? "border-[#8B5CF6]/50 bg-[#8B5CF6]/5"
                  : "border-[#243044] hover:border-[#243044]/80"
              } ${!canManage ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="_emergency_mode_radio"
                value={em.value}
                checked={mode === em.value}
                onChange={() => canManage && setMode(em.value)}
                disabled={!canManage}
                className="mt-0.5 accent-[#8B5CF6]"
              />
              <div>
                <p className="text-sm font-medium text-[#F4F7FB]">{em.label}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{em.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {mode === "automatic" && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-[8px] bg-[#2a1a0a] border border-[#F97316]/20 text-xs text-[#F97316]">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Automatic mode requires a finalized GenLayer consensus verdict before any pause action is executed. Supabase alone cannot trigger a pause.
          </div>
        )}
      </div>

      {/* Threat thresholds */}
      <div className="command-panel p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[#F4F7FB]">Threat Thresholds</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: "minimum_threat_for_soft_pause", label: "Soft Pause Threshold", default: (p.minimum_threat_for_soft_pause as string) ?? "high" },
            { name: "minimum_threat_for_hard_pause", label: "Hard Pause Threshold", default: (p.minimum_threat_for_hard_pause as string) ?? "critical" },
          ].map(({ name, label, default: def }) => (
            <div key={name} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">{label}</label>
              <select
                name={name}
                defaultValue={def}
                disabled={!canManage}
                className="px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#38BDF8]/50 disabled:opacity-50 appearance-none"
              >
                {THREAT_LEVELS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Safety controls */}
      <div className="command-panel p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[#F4F7FB]">Safety Controls</h2>
        <div className="flex flex-col gap-4">
          {[
            { name: "hard_pause_enabled", label: "Enable Hard Pause", desc: "Allow protocol contracts to be paused via Guardian.", default: (p.hard_pause_enabled as boolean) ?? false },
            { name: "human_approval_required_for_hard_pause", label: "Human Approval Required for Hard Pause", desc: "Require a human to confirm before executing pause.", default: (p.human_approval_required_for_hard_pause as boolean) ?? true },
            { name: "requires_explorer_evidence", label: "Require On-Chain Evidence", desc: "Signal must include verifiable on-chain transaction hashes.", default: (p.requires_explorer_evidence as boolean) ?? true },
            { name: "requires_multiple_sources_for_hard_pause", label: "Require Multiple Signal Sources for Hard Pause", desc: "Hard pause requires corroboration from multiple signal sources.", default: (p.requires_multiple_sources_for_hard_pause as boolean) ?? true },
            { name: "webhook_alerts_enabled", label: "Webhook Alerts", desc: "Send webhook events for threat level changes and decisions.", default: (p.webhook_alerts_enabled as boolean) ?? true },
          ].map(({ name, label, desc, default: def }) => (
            <div key={name} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#F4F7FB]">{label}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{desc}</p>
              </div>
              <Toggle name={name} defaultValue={def} disabled={!canManage} />
            </div>
          ))}
        </div>
      </div>

      {/* Incident expiry */}
      <div className="command-panel p-5 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#F4F7FB]">Incident Expiry</h2>
        <div className="flex items-center gap-3">
          <input
            name="incident_expiry_minutes"
            type="number"
            min={15}
            max={10080}
            defaultValue={(p.incident_expiry_minutes as number) ?? 60}
            disabled={!canManage}
            className="w-24 px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#38BDF8]/50 disabled:opacity-50"
          />
          <span className="text-sm text-[#64748B]">minutes before an unresolved incident auto-closes</span>
        </div>
      </div>

      {canManage && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-[8px] bg-[#8B5CF6] text-white font-bold text-sm hover:bg-[#a78bfa] transition-colors"
          >
            Save Pause Policy
          </button>
          <p className="text-xs text-[#64748B]">Policy hash is recorded on save for audit trail.</p>
        </div>
      )}
    </form>
  );
}

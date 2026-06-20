"use client";

import { cn } from "@/lib/utils";

type ThreatLevel = "none" | "low" | "elevated" | "high" | "critical";
type ActionType =
  | "observe"
  | "manual_review"
  | "soft_pause"
  | "hard_pause"
  | "disable_integration";
type ProtocolStatus =
  | "normal"
  | "monitoring"
  | "under_review"
  | "pause_recommended"
  | "paused"
  | "disabled";
type ConsensusStatus =
  | "pending"
  | "finalized"
  | "failed";

interface BadgeProps {
  className?: string;
  children: React.ReactNode;
  variant?: "default" | "outline";
}

export function Badge({ className, children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase font-mono-gl",
        variant === "outline" && "border border-current bg-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}

export function ThreatLevelBadge({ level }: { level: ThreatLevel }) {
  const map: Record<ThreatLevel, { label: string; className: string }> = {
    none:     { label: "NONE",     className: "bg-[#1a2535] text-[#64748B]" },
    low:      { label: "LOW",      className: "bg-[#14261a] text-[#22C55E]" },
    elevated: { label: "ELEVATED", className: "bg-[#2a2000] text-[#EAB308]" },
    high:     { label: "HIGH RISK",className: "bg-[#2a1500] text-[#F97316]" },
    critical: { label: "CRITICAL", className: "bg-[#2a0a0a] text-[#EF4444]" },
  };
  const { label, className } = map[level] ?? map.none;
  return <Badge className={className}>{label}</Badge>;
}

export function RecommendedActionBadge({ action }: { action: ActionType }) {
  const map: Record<ActionType, { label: string; className: string }> = {
    observe:             { label: "OBSERVE",          className: "bg-[#1a2535] text-[#9AA7B8]" },
    manual_review:       { label: "MANUAL REVIEW",    className: "bg-[#1e1030] text-[#A855F7]" },
    soft_pause:          { label: "SOFT PAUSE",       className: "bg-[#2a1500] text-[#F97316]" },
    hard_pause:          { label: "HARD PAUSE",       className: "bg-[#2a0a0a] text-[#EF4444]" },
    disable_integration: { label: "DISABLE INTEG.",  className: "bg-[#2a1500] text-[#F97316]" },
  };
  const { label, className } = map[action] ?? map.observe;
  return <Badge className={className}>{label}</Badge>;
}

export function ProtocolStatusBadge({ status }: { status: ProtocolStatus }) {
  const map: Record<ProtocolStatus, { label: string; className: string }> = {
    normal:           { label: "NORMAL",           className: "bg-[#14261a] text-[#22C55E]" },
    monitoring:       { label: "MONITORING",       className: "bg-[#071e2e] text-[#38BDF8]" },
    under_review:     { label: "UNDER REVIEW",     className: "bg-[#1e1030] text-[#A855F7]" },
    pause_recommended:{ label: "PAUSE RECOMMENDED",className: "bg-[#2a0a0a] text-[#EF4444]" },
    paused:           { label: "PAUSED",           className: "bg-[#1a0505] text-[#DC2626]" },
    disabled:         { label: "DISABLED",         className: "bg-[#1a2535] text-[#64748B]" },
  };
  const { label, className } = map[status] ?? map.normal;
  return <Badge className={className}>{label}</Badge>;
}

export function ConsensusBadge({ status }: { status: ConsensusStatus }) {
  const map: Record<ConsensusStatus, { label: string; className: string; dot: string }> = {
    pending:  { label: "GENLAYER PENDING",    className: "bg-[#1e1030] text-[#8B5CF6]", dot: "bg-[#8B5CF6] animate-blink" },
    finalized:{ label: "CONSENSUS CONFIRMED", className: "bg-[#071e2e] text-[#38BDF8]", dot: "bg-[#38BDF8]" },
    failed:   { label: "FAILED",              className: "bg-[#2a0a0a] text-[#EF4444]", dot: "bg-[#EF4444]" },
  };
  const { label, className, dot } = map[status] ?? map.pending;
  return (
    <Badge className={className}>
      <span className={cn("w-1.5 h-1.5 rounded-full inline-block", dot)} />
      {label}
    </Badge>
  );
}

export function EmergencyModeBadge({ mode }: { mode: string }) {
  const map: Record<string, { label: string; className: string }> = {
    alert_only: { label: "ALERT ONLY", className: "bg-[#071e2e] text-[#38BDF8]" },
    soft_pause: { label: "SOFT PAUSE", className: "bg-[#2a1500] text-[#F97316]" },
    hard_pause: { label: "HARD PAUSE", className: "bg-[#2a0a0a] text-[#EF4444]" },
  };
  const { label, className } = map[mode] ?? { label: mode.toUpperCase(), className: "bg-[#1a2535] text-[#9AA7B8]" };
  return <Badge className={className}>{label}</Badge>;
}

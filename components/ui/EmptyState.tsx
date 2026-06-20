import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 px-6 text-center",
        "border border-dashed border-[#243044] rounded-[16px]",
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[#121827] border border-[#243044] flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#64748B]" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-[#F4F7FB]">{title}</p>
        {description && <p className="text-sm text-[#64748B]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[8px] bg-[#121827]",
        className
      )}
    />
  );
}

export function MetricCard({
  label,
  value,
  sub,
  accent,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "cyan" | "violet" | "green" | "red" | "yellow";
  className?: string;
}) {
  const accentMap = {
    cyan:   "text-[#38BDF8]",
    violet: "text-[#8B5CF6]",
    green:  "text-[#22C55E]",
    red:    "text-[#EF4444]",
    yellow: "text-[#EAB308]",
  };

  return (
    <div
      className={cn(
        "command-panel p-5 flex flex-col gap-1",
        className
      )}
    >
      <p className="text-xs font-medium text-[#64748B] uppercase tracking-wider">{label}</p>
      <p
        className={cn(
          "text-2xl font-bold font-display",
          accent ? accentMap[accent] : "text-[#F4F7FB]"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-[#64748B]">{sub}</p>}
    </div>
  );
}

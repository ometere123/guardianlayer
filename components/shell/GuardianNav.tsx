"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Shield,
  AlertTriangle,
  Radio,
  Cpu,
  Key,
  Webhook,
  ScrollText,
  Users,
  Settings,
  ChevronRight,
  ChevronLeft,
  Pin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GuardianLayerLogo } from "@/components/brand/GuardianLayerLogo";

const navGroups = [
  {
    label: "Command",
    items: [
      { href: "/app/overview",   icon: LayoutDashboard, label: "Guardian Command" },
      { href: "/app/protocols",  icon: Shield,          label: "Protocol Registry" },
      { href: "/app/incidents",  icon: AlertTriangle,   label: "Incidents" },
      { href: "/app/signals",    icon: Radio,           label: "Signals" },
    ],
  },
  {
    label: "GenLayer",
    items: [
      { href: "/app/genlayer",   icon: Cpu,      label: "GenLayer Decisions" },
    ],
  },
  {
    label: "Integration",
    items: [
      { href: "/app/api-keys",   icon: Key,        label: "API Key Vault" },
      { href: "/app/webhooks",   icon: Webhook,    label: "Webhook Relay" },
    ],
  },
  {
    label: "Org",
    items: [
      { href: "/app/audit-logs", icon: ScrollText,  label: "Audit Ledger" },
      { href: "/app/team",       icon: Users,       label: "Team" },
      { href: "/app/settings",   icon: Settings,    label: "Settings" },
    ],
  },
];

export function GuardianNav() {
  const pathname = usePathname();
  const [pinned, setPinned] = useState(true);
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
    if (!pinned) setHovered(true);
  }, [pinned]);

  const handleMouseLeave = useCallback(() => {
    if (!pinned) {
      leaveTimer.current = setTimeout(() => setHovered(false), 200);
    }
  }, [pinned]);

  // expanded = shows full labels; collapsed = icons only
  const expanded = pinned || hovered;
  // When unpinned and hovered, sidebar overlays content instead of pushing it
  const overlay = !pinned && hovered;

  return (
    <>
      {/* Spacer — reserves layout width when pinned, or thin strip when collapsed */}
      <div className={cn("flex-shrink-0 transition-all duration-200", pinned ? "w-60" : "w-16")} />

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "fixed top-0 left-0 h-screen bg-[#0D111C] border-r border-[#243044] flex flex-col transition-all duration-200 z-40",
          expanded ? "w-60" : "w-16",
          overlay && "shadow-2xl shadow-black/50"
        )}
      >
        {/* Pin/unpin toggle — sits on the right border */}
        <button
          onClick={() => { setPinned(!pinned); setHovered(false); }}
          className="absolute -right-3 bottom-12 z-10 w-6 h-6 rounded-full bg-[#0D111C] border border-[#243044] flex items-center justify-center text-[#64748B] hover:text-[#F4F7FB] hover:border-[#38BDF8]/30 transition-colors"
          title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
        >
          {pinned ? <ChevronLeft className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </button>

        {/* Logo */}
        <div className={cn("py-5 border-b border-[#243044]", expanded ? "px-5" : "px-3 flex justify-center")}>
          <Link href="/app/overview">
            {expanded ? (
              <GuardianLayerLogo size="sm" />
            ) : (
              <div className="w-8 h-8 rounded-[8px] bg-[#071e2e] border border-[#38BDF8]/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#38BDF8]" />
              </div>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              {expanded && (
                <p className="px-5 mb-1 text-[10px] font-semibold tracking-widest uppercase text-[#64748B]">
                  {group.label}
                </p>
              )}
              {group.items.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    title={!expanded ? label : undefined}
                    className={cn(
                      "flex items-center gap-3 py-2.5 text-sm transition-all duration-150 group",
                      expanded ? "px-5" : "justify-center px-0",
                      active
                        ? "text-[#F4F7FB] bg-[#121827] border-r-2 border-[#38BDF8]"
                        : "text-[#64748B] hover:text-[#9AA7B8] hover:bg-[#121827]/50"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 flex-shrink-0",
                        active ? "text-[#38BDF8]" : "text-current"
                      )}
                    />
                    {expanded && <span className="flex-1 whitespace-nowrap">{label}</span>}
                    {expanded && active && (
                      <ChevronRight className="w-3 h-3 text-[#38BDF8] opacity-50" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom status */}
        <div className={cn("py-4 border-t border-[#243044]", expanded ? "px-5" : "px-3 flex justify-center")}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-blink flex-shrink-0" />
            {expanded && (
              <>
                <span className="text-xs text-[#64748B]">Studionet</span>
                <span className="ml-auto text-[10px] font-mono-gl text-[#243044]">61999</span>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

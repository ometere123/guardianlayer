"use client";

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

  return (
    <aside className="w-60 min-h-screen bg-[#0D111C] border-r border-[#243044] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#243044]">
        <Link href="/app/overview">
          <GuardianLayerLogo size="sm" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-5 mb-1 text-[10px] font-semibold tracking-widest uppercase text-[#64748B]">
              {group.label}
            </p>
            {group.items.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-150 group",
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
                  <span className="flex-1">{label}</span>
                  {active && (
                    <ChevronRight className="w-3 h-3 text-[#38BDF8] opacity-50" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom status */}
      <div className="px-5 py-4 border-t border-[#243044]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-blink" />
          <span className="text-xs text-[#64748B]">Studionet</span>
          <span className="ml-auto text-[10px] font-mono-gl text-[#243044]">61999</span>
        </div>
      </div>
    </aside>
  );
}

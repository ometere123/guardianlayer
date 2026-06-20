"use client";

import { Bell, ChevronDown, User } from "lucide-react";
import Link from "next/link";

interface CommandRibbonProps {
  orgName?: string;
  userEmail?: string;
}

export function CommandRibbon({ orgName = "Your Organisation", userEmail }: CommandRibbonProps) {
  return (
    <header className="h-14 bg-[#0D111C] border-b border-[#243044] flex items-center px-6 gap-4 flex-shrink-0">
      {/* Org switcher */}
      <button className="flex items-center gap-2 text-sm text-[#9AA7B8] hover:text-[#F4F7FB] transition-colors">
        <span className="w-6 h-6 rounded-[6px] bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center text-[10px] font-bold text-[#38BDF8] font-display">
          {orgName.slice(0, 1).toUpperCase()}
        </span>
        <span className="font-medium">{orgName}</span>
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>

      <div className="flex-1" />

      {/* Status pill */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#14261a] border border-[#22C55E]/20">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-blink" />
        <span className="text-[11px] text-[#22C55E] font-medium">Monitoring Active</span>
      </div>

      {/* Notifications */}
      <button className="w-8 h-8 rounded-[8px] bg-[#121827] border border-[#243044] flex items-center justify-center text-[#64748B] hover:text-[#F4F7FB] hover:border-[#38BDF8]/30 transition-all">
        <Bell className="w-4 h-4" />
      </button>

      {/* User */}
      <Link
        href="/app/profile"
        className="flex items-center gap-2 text-sm text-[#9AA7B8] hover:text-[#F4F7FB] transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#121827] border border-[#243044] flex items-center justify-center">
          <User className="w-4 h-4 text-[#64748B]" />
        </div>
        {userEmail && (
          <span className="hidden md:block text-xs truncate max-w-[120px]">{userEmail}</span>
        )}
      </Link>
    </header>
  );
}

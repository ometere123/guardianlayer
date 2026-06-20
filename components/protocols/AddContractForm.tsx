"use client";

import { useState } from "react";
import { addMonitoredContract } from "@/lib/protocols/actions";
import { Plus, ChevronDown } from "lucide-react";

type Props = { protocolId: string; chain: string; network: string };

const ROLES = ["core", "proxy", "vault", "oracle", "governance", "router", "factory", "other"];

export function AddContractForm({ protocolId, chain, network }: Props) {
  const [open, setOpen] = useState(false);
  const [pauseCapable, setPauseCapable] = useState(false);

  return (
    <div className="command-panel overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-[#9AA7B8] hover:text-[#F4F7FB] transition-colors"
      >
        <span className="flex items-center gap-2"><Plus className="w-4 h-4 text-[#38BDF8]" /> Add Contract</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <form action={addMonitoredContract} className="px-5 pb-5 flex flex-col gap-4 border-t border-[#243044]">
          <input type="hidden" name="protocol_id" value={protocolId} />
          <input type="hidden" name="chain" value={chain} />
          <input type="hidden" name="network" value={network} />

          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Contract Name *</label>
              <input
                name="name"
                required
                placeholder="e.g. Core Pool"
                className="px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] placeholder:text-[#374151] focus:outline-none focus:border-[#38BDF8]/50 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Role</label>
              <select
                name="role"
                defaultValue="other"
                className="px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#38BDF8]/50 appearance-none"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Contract Address *</label>
            <input
              name="address"
              required
              placeholder="0x…"
              pattern="^0x[0-9a-fA-F]{40}$"
              className="px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm font-mono-gl text-[#F4F7FB] placeholder:text-[#374151] focus:outline-none focus:border-[#38BDF8]/50 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_pause_capable"
                value="true"
                checked={pauseCapable}
                onChange={e => setPauseCapable(e.target.checked)}
                className="w-4 h-4 rounded accent-[#38BDF8]"
              />
              <span className="text-sm text-[#9AA7B8]">Contract has pause function</span>
            </label>
          </div>

          {pauseCapable && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Pause Function Name</label>
              <input
                name="pause_function_name"
                placeholder="pause"
                defaultValue="pause"
                className="px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm font-mono-gl text-[#F4F7FB] placeholder:text-[#374151] focus:outline-none focus:border-[#38BDF8]/50 transition-colors"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-[8px] bg-[#38BDF8] text-[#070A12] text-sm font-bold hover:bg-[#7DD3FC] transition-colors"
            >
              Add Contract
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-[8px] bg-[#121827] text-[#9AA7B8] text-sm hover:bg-[#1e2a3a] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createProtocol } from "@/lib/protocols/actions";
import { AuthAlert } from "@/components/auth/AuthAlert";
import { Shield } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Register Protocol — Guardian Layer" };

const CATEGORIES = ["defi", "bridge", "lending", "dex", "derivatives", "nft", "dao", "staking", "other"];
const CHAINS = ["ethereum", "polygon", "arbitrum", "optimism", "base", "avalanche", "bsc", "solana", "other"];
const NETWORKS = ["mainnet", "testnet", "devnet"];

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewProtocolPage({ searchParams }: Props) {
  const params = await searchParams;
  const errorMsg = params.error ? decodeURIComponent(params.error).replace(/_/g, " ") : null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = await createServiceClient();
  const membershipResult = await service
    .from("organisation_members")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const membership = membershipResult.data as { role: string } | null;

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    redirect("/app/protocols");
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-[#38BDF8]" />
          <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">Register Protocol</h1>
        </div>
        <p className="text-sm text-[#64748B]">
          Add a protocol to begin monitoring exploit signals and submitting incidents to GenLayer.
        </p>
      </div>

      <form action={createProtocol} className="command-panel p-6 flex flex-col gap-5">
        {errorMsg && <AuthAlert message={errorMsg} />}

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Protocol Name *</label>
          <input
            name="name"
            required
            placeholder="e.g. Uniswap V4"
            maxLength={100}
            className="px-3 py-2.5 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] placeholder:text-[#374151] focus:outline-none focus:border-[#38BDF8]/50 transition-colors"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Description</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Brief description of the protocol and what it does…"
            className="px-3 py-2.5 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] placeholder:text-[#374151] focus:outline-none focus:border-[#38BDF8]/50 transition-colors resize-none"
          />
        </div>

        {/* Category + Chain + Network */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Category</label>
            <select
              name="category"
              defaultValue="defi"
              className="px-3 py-2.5 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#38BDF8]/50 transition-colors appearance-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Chain</label>
            <select
              name="chain"
              defaultValue="ethereum"
              className="px-3 py-2.5 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#38BDF8]/50 transition-colors appearance-none"
            >
              {CHAINS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Network</label>
            <select
              name="network"
              defaultValue="mainnet"
              className="px-3 py-2.5 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#38BDF8]/50 transition-colors appearance-none"
            >
              {NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Website + GitHub */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Website URL</label>
            <input
              name="website_url"
              type="url"
              placeholder="https://…"
              className="px-3 py-2.5 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] placeholder:text-[#374151] focus:outline-none focus:border-[#38BDF8]/50 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">GitHub URL</label>
            <input
              name="github_url"
              type="url"
              placeholder="https://github.com/…"
              className="px-3 py-2.5 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] placeholder:text-[#374151] focus:outline-none focus:border-[#38BDF8]/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1 border-t border-[#243044]">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-[8px] bg-[#38BDF8] text-[#070A12] font-bold text-sm hover:bg-[#7DD3FC] transition-colors"
          >
            Register Protocol
          </button>
          <Link
            href="/app/protocols"
            className="px-5 py-2.5 rounded-[8px] bg-[#121827] text-[#9AA7B8] text-sm hover:bg-[#1e2a3a] transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

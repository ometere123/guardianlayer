"use client";

import { useState } from "react";
import { Cpu, CheckCircle, ExternalLink, Loader2 } from "lucide-react";

type Props = {
  protocolId: string;
  registered: boolean;
  txHash: string | null;
};

export function GenLayerRegisterButton({ protocolId, registered, txHash }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tx_hash: string; explorer_url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const explorerBase = process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL ?? "https://explorer-studio.genlayer.com";

  const existingExplorer = txHash ? `${explorerBase}/tx/${txHash}` : null;

  if (registered && !result) {
    return (
      <a
        href={existingExplorer ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] text-xs font-medium"
        title="View registration on GenLayer Explorer"
      >
        <CheckCircle className="w-3.5 h-3.5" /> Registered on GenLayer
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  if (result) {
    return (
      <a
        href={result.explorer_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-xs font-medium"
      >
        <CheckCircle className="w-3.5 h-3.5" /> Registered! View tx
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  async function handleRegister() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/genlayer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocol_id: protocolId }),
      });
      const json = await res.json() as { ok?: boolean; tx_hash?: string; explorer_url?: string; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Registration failed");
      } else {
        setResult({ tx_hash: json.tx_hash!, explorer_url: json.explorer_url! });
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRegister}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] text-xs font-medium hover:bg-[#8B5CF6]/20 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
        {loading ? "Registering…" : "Register on GenLayer"}
      </button>
      {error && <p className="text-[10px] text-[#EF4444]">{error}</p>}
    </div>
  );
}

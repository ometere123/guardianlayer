"use client";

import { useState } from "react";
import { Shield, Copy, Check, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { completeOnboarding } from "@/lib/auth/actions";

interface Props {
  userId: string;
  orgId: string;
  orgName: string;
  existingWalletAddress: string | null;
}

export function WalletSetupPanel({ userId, orgId, orgName, existingWalletAddress }: Props) {
  const [walletAddress, setWalletAddress] = useState<string | null>(existingWalletAddress);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [recoveryCopied, setRecoveryCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, org_id: orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Wallet creation failed");
      setWalletAddress(data.wallet_address);
      if (data.recovery_hint) setRecoveryKey(data.recovery_hint);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  async function copyAddress() {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyRecovery() {
    if (!recoveryKey) return;
    await navigator.clipboard.writeText(recoveryKey);
    setRecoveryCopied(true);
    setTimeout(() => setRecoveryCopied(false), 2000);
  }

  if (!walletAddress) {
    return (
      <div className="command-panel p-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#071e2e] border border-[#38BDF8]/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#38BDF8]" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display text-[#F4F7FB]">Generate embedded wallet</h1>
            <p className="text-sm text-[#64748B]">Permanent on-chain identity for {orgName}</p>
          </div>
        </div>

        <div className="p-4 rounded-[10px] bg-[#121827] border border-[#243044] flex flex-col gap-2">
          <p className="text-xs text-[#9AA7B8] leading-relaxed">
            Your GUARDIAN LAYER wallet is permanently attached to this account and organisation.
            It is used for GenLayer protocol registration and incident submissions.
          </p>
          <p className="text-xs text-[#EAB308]">
            This wallet is generated once and cannot be replaced without the recovery key.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-[10px] bg-[#2a0a0a] border border-[#EF4444]/30 text-[#EF4444] text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full h-10 rounded-[8px] bg-[#38BDF8] text-[#070A12] font-bold text-sm hover:bg-[#7DD3FC] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating Wallet…</>
          ) : (
            "Generate Permanent Wallet"
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="command-panel p-8 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-[#14261a] border border-[#22C55E]/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#22C55E]" />
        </div>
        <div>
          <h1 className="text-lg font-bold font-display text-[#F4F7FB]">Wallet created</h1>
          <p className="text-sm text-[#64748B]">Permanently attached to {orgName}</p>
        </div>
      </div>

      {/* Wallet address */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-[#9AA7B8]">Wallet Address</p>
        <div className="flex items-center gap-2 bg-[#070A12] border border-[#243044] rounded-[8px] p-3">
          <code className="flex-1 font-mono-gl text-[12px] text-[#38BDF8] break-all">{walletAddress}</code>
          <button onClick={copyAddress} className="text-[#64748B] hover:text-[#38BDF8] transition-colors flex-shrink-0">
            {copied ? <Check className="w-4 h-4 text-[#22C55E]" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Recovery key — shown once only */}
      {recoveryKey && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#EAB308]" />
            <p className="text-xs font-semibold text-[#EAB308]">Recovery Key — shown once only</p>
          </div>
          <div className="flex items-center gap-2 bg-[#070A12] border border-[#EAB308]/30 rounded-[8px] p-3">
            <code className="flex-1 font-mono-gl text-[12px] text-[#EAB308] break-all">{recoveryKey}</code>
            <button onClick={copyRecovery} className="text-[#64748B] hover:text-[#EAB308] transition-colors flex-shrink-0">
              {recoveryCopied ? <Check className="w-4 h-4 text-[#22C55E]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-[#64748B]">
            Store this in a secure location. You will need it to re-encrypt your wallet after a password reset.
            It will not be shown again.
          </p>
        </div>
      )}

      {/* Acknowledgement */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="ack"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#38BDF8]"
        />
        <label htmlFor="ack" className="text-xs text-[#64748B]">
          I have saved my recovery key and understand that my wallet address will remain the same after any password reset.
        </label>
      </div>

      <form action={completeOnboarding}>
        <button
          type="submit"
          disabled={!confirmed}
          className="w-full h-10 rounded-[8px] bg-[#38BDF8] text-[#070A12] font-bold text-sm hover:bg-[#7DD3FC] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Enter Guardian Command <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

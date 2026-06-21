"use client";

import { useState } from "react";
import { Cpu, ExternalLink, Loader2, RefreshCw, Zap, FastForward } from "lucide-react";

type Step = "submit" | "adjudicate" | "sync" | "fast-track";

type Props = {
  incidentId: string;
  incidentKey: string;
  genlayerTxHash: string | null;
  decisionId: string | null;
  decisionStatus: string | null;
};

export function GenLayerIncidentPanel({
  incidentId,
  genlayerTxHash,
  decisionStatus,
}: Props) {
  const [loading, setLoading] = useState<Step | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fastTracking, setFastTracking] = useState(false);
  const [results, setResults] = useState<Record<string, Record<string, unknown> | null>>({
    submit: null,
    adjudicate: null,
    sync: null,
  });

  async function callStep(step: Step) {
    setLoading(step);
    setError(null);
    try {
      const res = await fetch(`/api/genlayer/${step}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incidentId }),
      });
      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setError((json.error as string) ?? `${step} failed`);
      } else {
        setResults(prev => ({ ...prev, [step]: json }));
        if (step === "sync") {
          // Reload page to show updated decision
          window.location.reload();
        }
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(null);
    }
  }

  async function handleFastTrack() {
    setFastTracking(true);
    setError(null);
    try {
      const res = await fetch("/api/genlayer/fast-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incidentId }),
      });
      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setError((json.error as string) ?? "Fast-track failed");
      } else {
        const steps = json.steps as Record<string, Record<string, unknown>> | undefined;
        if (steps) {
          setResults({ submit: steps.submit ?? null, adjudicate: steps.adjudicate ?? null, sync: steps.sync ?? null });
        }
        if (json.synced) window.location.reload();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setFastTracking(false);
    }
  }

  const explorerBase = process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL ?? "https://explorer-studio.genlayer.com";

  const submitResult = results.submit;
  const adjResult = results.adjudicate;
  const syncResult = results.sync;
  const adjExplorerUrl = adjResult?.["explorer_url"] as string | undefined;
  const adjFinalized = adjResult?.["finalized"] === true;
  const syncNotReady = syncResult && syncResult["ok"] === false;

  // Determine current state
  const isSubmitted = !!genlayerTxHash || !!submitResult;
  const currentTxHash = (submitResult?.tx_hash as string | undefined) ?? genlayerTxHash;
  // "adjudicating" = tx sent, validators still writing consensus
  const isAdjudicated = adjFinalized || ["adjudicated", "adjudicating", "finalized"].includes(decisionStatus ?? "");
  const isSynced = decisionStatus === "finalized" || (syncResult?.["ok"] === true && syncResult?.["synced"] === true);

  return (
    <div className="command-panel p-5 flex flex-col gap-4 border-[#8B5CF6]/20">
      <div className="flex items-center gap-2">
        <Cpu className="w-4 h-4 text-[#8B5CF6]" />
        <p className="text-sm font-semibold text-[#F4F7FB]">GenLayer Consensus Flow</p>
        <span className="ml-auto text-[10px] text-[#64748B]">
          Contract: {process.env.NEXT_PUBLIC_GUARDIAN_LAYER_CONTRACT_ADDRESS?.slice(0, 10)}…
        </span>
      </div>

      {/* Fast Track — one-click full flow */}
      {!isSubmitted && !fastTracking && (
        <button
          onClick={handleFastTrack}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[8px] bg-gradient-to-r from-[#8B5CF6] to-[#38BDF8] text-white text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <FastForward className="w-4 h-4" /> Fast Track — Submit, Adjudicate & Sync
        </button>
      )}
      {fastTracking && (
        <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[8px] bg-[#121827] border border-[#8B5CF6]/20 text-[#8B5CF6] text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin" /> Running full consensus flow — this takes 2–7 minutes…
        </div>
      )}

      {/* Step 1: Submit */}
      <div className="flex items-center gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isSubmitted ? "bg-[#8B5CF6] text-white" : "bg-[#243044] text-[#64748B]"}`}>
          1
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-[#F4F7FB]">Submit incident to contract</p>
          {currentTxHash && (
            <a href={`${explorerBase}/tx/${currentTxHash}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-[#8B5CF6] mt-0.5">
              <ExternalLink className="w-3 h-3" /> View tx
            </a>
          )}
        </div>
        {!isSubmitted && (
          <button
            onClick={() => callStep("submit")}
            disabled={loading === "submit"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] text-xs font-medium hover:bg-[#8B5CF6]/20 transition-colors disabled:opacity-50"
          >
            {loading === "submit" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {loading === "submit" ? "Submitting…" : "Submit"}
          </button>
        )}
        {isSubmitted && <span className="text-[10px] text-[#8B5CF6] font-medium">Done</span>}
      </div>

      {/* Step 2: Adjudicate */}
      <div className="flex items-center gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isAdjudicated ? "bg-[#8B5CF6] text-white" : "bg-[#243044] text-[#64748B]"}`}>
          2
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-[#F4F7FB]">Request AI adjudication</p>
          <p className="text-[10px] text-[#64748B]">Waits for validator consensus (~2–7 min)</p>
          {adjExplorerUrl && (
            <a href={adjExplorerUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-[#8B5CF6] mt-0.5">
              <ExternalLink className="w-3 h-3" /> View adjudication tx
            </a>
          )}
          {adjResult && !adjFinalized && (
            <p className="text-[10px] text-[#EAB308] mt-0.5">Tx submitted — validators are writing consensus. Proceed to Sync to check.</p>
          )}
          {decisionStatus === "adjudicating" && !adjResult && (
            <p className="text-[10px] text-[#EAB308] mt-0.5">Awaiting validator consensus — click Sync when ready</p>
          )}
        </div>
        {isSubmitted && !isAdjudicated && (
          <button
            onClick={() => callStep("adjudicate")}
            disabled={loading === "adjudicate"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] text-xs font-medium hover:bg-[#8B5CF6]/20 transition-colors disabled:opacity-50"
          >
            {loading === "adjudicate" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
            {loading === "adjudicate" ? "Adjudicating…" : "Adjudicate"}
          </button>
        )}
        {isAdjudicated && <span className="text-[10px] text-[#8B5CF6] font-medium">Done</span>}
      </div>

      {/* Step 3: Sync */}
      <div className="flex items-center gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isSynced ? "bg-[#22C55E] text-white" : "bg-[#243044] text-[#64748B]"}`}>
          3
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-[#F4F7FB]">Sync decision to Guardian Layer</p>
          <p className="text-[10px] text-[#64748B]">Mirrors GenLayer verdict — updates protocol threat level</p>
          {syncNotReady && (
            <p className="text-[10px] text-[#EAB308] mt-0.5">Validators still writing — wait ~1 min and retry</p>
          )}
        </div>
        {isAdjudicated && !isSynced && (
          <button
            onClick={() => callStep("sync")}
            disabled={loading === "sync"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-xs font-medium hover:bg-[#22C55E]/20 transition-colors disabled:opacity-50"
          >
            {loading === "sync" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {loading === "sync" ? "Syncing…" : syncNotReady ? "Retry Sync" : "Sync Decision"}
          </button>
        )}
        {isSynced && <span className="text-[10px] text-[#22C55E] font-medium">Synced</span>}
      </div>

      {/* Verdict summary after sync */}
      {isSynced && !!syncResult?.["verdict"] && <VerdictCard verdict={syncResult["verdict"] as Record<string, unknown>} autoPaused={syncResult["auto_pause_triggered"] === true} />}

      {error && (
        <div className="px-3 py-2 rounded-[8px] bg-[#2a0a0a] border border-[#EF4444]/20 text-xs text-[#EF4444]">
          {error}
        </div>
      )}

      <p className="text-[10px] text-[#64748B] border-t border-[#243044] pt-3">
        GenLayer is the authoritative source of truth. Supabase mirrors the verdict but does not override it.
      </p>
    </div>
  );
}

function VerdictCard({ verdict, autoPaused }: { verdict: Record<string, unknown>; autoPaused: boolean }) {
  const threat = String(verdict.threat_level ?? "none");
  const classification = threat === "critical" ? "CRITICAL" : threat === "high" ? "SUSPICIOUS" : "SAFE";
  const colors: Record<string, string> = {
    CRITICAL: "bg-[#450a0a] border-[#EF4444]/30 text-[#EF4444]",
    SUSPICIOUS: "bg-[#451a03] border-[#F97316]/30 text-[#F97316]",
    SAFE: "bg-[#052e16] border-[#22C55E]/30 text-[#22C55E]",
  };
  return (
    <div className={`p-4 rounded-[10px] border ${colors[classification]} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">{classification}</span>
        <span className="text-[10px] opacity-70">threat: {threat}</span>
      </div>
      {!!verdict.reasoning && <p className="text-xs opacity-80">{String(verdict.reasoning)}</p>}
      <div className="flex gap-3 text-[10px] opacity-60">
        {!!verdict.recommended_action && <span>Action: {String(verdict.recommended_action)}</span>}
        {!!verdict.confidence_label && <span>Confidence: {String(verdict.confidence_label)}</span>}
      </div>
      {autoPaused && (
        <p className="text-xs font-semibold text-[#EF4444] mt-1">Auto-pause triggered on protocol</p>
      )}
    </div>
  );
}

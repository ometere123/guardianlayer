"use client";

import { useState } from "react";
import { Database, Loader2, RefreshCw, CheckCircle, XCircle } from "lucide-react";

type Props = {
  protocols: Array<{ id: string; name: string; protocol_key: string; genlayer_protocol_registered: boolean }>;
  incidents: Array<{ id: string; title: string; incident_key: string; genlayer_tx_hash: string | null }>;
};

export function ContractStateViewer({ protocols, incidents }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState(protocols[0]?.protocol_key ?? "");
  const [selectedIncident, setSelectedIncident] = useState(incidents[0]?.incident_key ?? "");

  async function queryContract() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProtocol) params.set("protocol_key", selectedProtocol);
      if (selectedIncident) params.set("incident_key", selectedIncident);
      const res = await fetch(`/api/genlayer/contract-state?${params}`);
      const json = await res.json() as Record<string, unknown>;
      setResult(json);
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  const contractAddress = process.env.NEXT_PUBLIC_GUARDIAN_LAYER_CONTRACT_ADDRESS ?? "";

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5 text-[#8B5CF6]" />
          <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">Contract State Viewer</h1>
        </div>
        <p className="text-sm text-[#64748B]">
          Read live state from the GenLayer contract. Compare with Supabase to verify source of truth.
        </p>
        <p className="text-xs font-mono-gl text-[#243044] mt-1">{contractAddress}</p>
      </div>

      <div className="command-panel p-5 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Protocol</label>
            <select
              value={selectedProtocol}
              onChange={e => setSelectedProtocol(e.target.value)}
              className="px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#8B5CF6]/50 appearance-none"
            >
              <option value="">None</option>
              {protocols.map(p => (
                <option key={p.protocol_key} value={p.protocol_key}>
                  {p.name} ({p.protocol_key.slice(0, 12)}…)
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Incident</label>
            <select
              value={selectedIncident}
              onChange={e => setSelectedIncident(e.target.value)}
              className="px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#8B5CF6]/50 appearance-none"
            >
              <option value="">None</option>
              {incidents.map(i => (
                <option key={i.incident_key} value={i.incident_key}>
                  {i.title.slice(0, 40)}… ({i.incident_key.slice(0, 12)}…)
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={queryContract}
          disabled={loading || (!selectedProtocol && !selectedIncident)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-[8px] bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] text-sm font-medium hover:bg-[#8B5CF6]/20 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? "Reading contract…" : "Read Contract State"}
        </button>
      </div>

      {result && (
        <div className="command-panel p-5 flex flex-col gap-4">
          <p className="text-xs text-[#64748B]">Queried at {String(result.timestamp ?? "")}</p>

          {!!result.protocol && <ProtocolStateBlock data={result.protocol as Record<string, unknown>} />}
          {!!result.incident && <IncidentStateBlock data={result.incident as Record<string, unknown>} />}
        </div>
      )}
    </div>
  );
}

function ProtocolStateBlock({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-[#F4F7FB]">Protocol: {String(data.key)}</p>
        {data.registered === true ? (
          <span className="flex items-center gap-1 text-[10px] text-[#22C55E]"><CheckCircle className="w-3 h-3" /> Registered</span>
        ) : data.registered === false ? (
          <span className="flex items-center gap-1 text-[10px] text-[#EF4444]"><XCircle className="w-3 h-3" /> Not registered</span>
        ) : null}
      </div>
      {!!data.state && (
        <pre className="text-xs font-mono-gl text-[#9AA7B8] bg-[#070A12] border border-[#243044] rounded-[8px] p-3 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(data.state, null, 2)}
        </pre>
      )}
      {!!data.error && <p className="text-xs text-[#EF4444]">{String(data.error)}</p>}
    </div>
  );
}

function IncidentStateBlock({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm font-semibold text-[#F4F7FB]">Incident: {String(data.key)}</p>
        {data.submitted === true && <span className="text-[10px] text-[#22C55E] flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Submitted</span>}
        {data.adjudicated === true && <span className="text-[10px] text-[#8B5CF6] flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Adjudicated</span>}
        {data.adjudicated === false && <span className="text-[10px] text-[#EAB308] flex items-center gap-1"><XCircle className="w-3 h-3" /> Not adjudicated</span>}
      </div>
      {!!data.verdict && (
        <pre className="text-xs font-mono-gl text-[#9AA7B8] bg-[#070A12] border border-[#243044] rounded-[8px] p-3 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(data.verdict, null, 2)}
        </pre>
      )}
      {!!data.error && <p className="text-xs text-[#EF4444]">{String(data.error)}</p>}
    </div>
  );
}

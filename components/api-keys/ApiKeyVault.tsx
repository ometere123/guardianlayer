"use client";

import { useState, useCallback } from "react";
import { Key, Copy, Trash2, Check, Plus, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  status: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type Props = {
  initialKeys: ApiKey[];
};

const SCOPE_LABELS: Record<string, string> = {
  "signals:write": "Submit Signals",
  "protocols:read": "Read Protocols",
  "incidents:read": "Read Incidents",
  "guard:check": "Guard Check",
};

const ALL_SCOPES = Object.keys(SCOPE_LABELS);

export function ApiKeyVault({ initialKeys }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [newKeyPlaintext, setNewKeyPlaintext] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [env, setEnv] = useState<"live" | "test">("live");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(ALL_SCOPES);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleCreate = useCallback(async () => {
    if (!name.trim()) { setError("Key name is required"); return; }
    if (!selectedScopes.length) { setError("Select at least one scope"); return; }
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), env, scopes: selectedScopes }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create key"); return; }
      setNewKeyPlaintext(json.key);
      setKeys(prev => [json.meta, ...prev]);
      setFormOpen(false);
      setName("");
      setEnv("live");
      setSelectedScopes(ALL_SCOPES);
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  }, [name, env, selectedScopes]);

  const handleRevoke = useCallback(async (id: string) => {
    setRevoking(id);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys(prev =>
          prev.map(k => k.id === id ? { ...k, status: "revoked", revoked_at: new Date().toISOString() } : k)
        );
      }
    } finally {
      setRevoking(null);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!newKeyPlaintext) return;
    await navigator.clipboard.writeText(newKeyPlaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [newKeyPlaintext]);

  return (
    <div className="flex flex-col gap-6">
      {/* New key reveal panel */}
      {newKeyPlaintext && (
        <div className="p-5 rounded-[12px] bg-[#0f2a1a] border border-[#22C55E]/30 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#22C55E]" />
            <p className="text-sm font-semibold text-[#22C55E]">
              Copy your API key - it will not be shown again.
            </p>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-[8px] bg-[#070A12] border border-[#243044]">
            <code className="flex-1 text-sm font-mono-gl text-[#F4F7FB] truncate">
              {showKey ? newKeyPlaintext : "gl_" + "•".repeat(36)}
            </code>
            <button
              onClick={() => setShowKey(v => !v)}
              className="p-1.5 rounded-[6px] hover:bg-[#1e2a3a] transition-colors text-[#64748B] hover:text-[#9AA7B8]"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-[6px] bg-[#22C55E] text-[#070A12] text-xs font-bold hover:bg-[#4ade80] transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setNewKeyPlaintext(null)}
            className="text-xs text-[#64748B] hover:text-[#9AA7B8] text-right transition-colors"
          >
            I&apos;ve saved it - dismiss
          </button>
        </div>
      )}

      {/* Create key form */}
      {formOpen ? (
        <div className="command-panel p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-[#F4F7FB]">New API Key</h3>

          {error && (
            <p className="text-xs text-[#EF4444] bg-[#2a0a0a] border border-[#EF4444]/20 rounded-[8px] px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#64748B] uppercase tracking-wider">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. CI/CD monitor"
              maxLength={80}
              className="px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] placeholder:text-[#374151] focus:outline-none focus:border-[#38BDF8]/50 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#64748B] uppercase tracking-wider">Environment</label>
            <div className="flex gap-2">
              {(["live", "test"] as const).map(e => (
                <button
                  key={e}
                  onClick={() => setEnv(e)}
                  className={`px-4 py-1.5 rounded-[6px] text-xs font-medium transition-colors ${
                    env === e
                      ? e === "live"
                        ? "bg-[#38BDF8] text-[#070A12]"
                        : "bg-[#8B5CF6] text-white"
                      : "bg-[#121827] text-[#64748B] hover:text-[#9AA7B8]"
                  }`}
                >
                  {e === "live" ? "gl_live_…" : "gl_test_…"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-[#64748B] uppercase tracking-wider">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SCOPES.map(scope => (
                <button
                  key={scope}
                  onClick={() => toggleScope(scope)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedScopes.includes(scope)
                      ? "bg-[#38BDF8]/10 border-[#38BDF8]/40 text-[#38BDF8]"
                      : "bg-transparent border-[#243044] text-[#64748B] hover:border-[#38BDF8]/20"
                  }`}
                >
                  {SCOPE_LABELS[scope]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 rounded-[8px] bg-[#38BDF8] text-[#070A12] text-sm font-bold hover:bg-[#7DD3FC] disabled:opacity-50 transition-colors"
            >
              {creating ? "Generating…" : "Generate Key"}
            </button>
            <button
              onClick={() => { setFormOpen(false); setError(null); }}
              className="px-4 py-2 rounded-[8px] bg-[#121827] text-[#9AA7B8] text-sm hover:bg-[#1e2a3a] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] bg-[#38BDF8] text-[#070A12] text-sm font-bold hover:bg-[#7DD3FC] transition-colors self-start"
        >
          <Plus className="w-4 h-4" /> Generate API Key
        </button>
      )}

      {/* Key list */}
      <div className="command-panel overflow-hidden">
        {keys.length === 0 ? (
          <div className="p-8 text-center">
            <Key className="w-8 h-8 text-[#243044] mx-auto mb-3" />
            <p className="text-sm text-[#64748B]">No API keys yet. Generate one to integrate your protocol.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#243044]">
                {["Name", "Prefix", "Scopes", "Status", "Last Used", ""].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-wider px-5 py-4 first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className={`border-b border-[#243044]/50 ${k.status === "revoked" ? "opacity-50" : ""}`}>
                  <td className="px-5 py-3 font-medium text-[#F4F7FB]">{k.name}</td>
                  <td className="px-5 py-3">
                    <code className="text-xs font-mono-gl text-[#9AA7B8] bg-[#121827] px-2 py-1 rounded">{k.prefix}…</code>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map(s => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      k.status === "active"
                        ? "bg-[#14261a] text-[#22C55E] border border-[#22C55E]/20"
                        : "bg-[#2a0a0a] text-[#EF4444] border border-[#EF4444]/20"
                    }`}>
                      {k.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-[#64748B]">
                    {k.last_used_at ? formatTimeAgo(k.last_used_at) : "Never"}
                  </td>
                  <td className="px-5 py-3">
                    {k.status === "active" && (
                      <button
                        onClick={() => handleRevoke(k.id)}
                        disabled={revoking === k.id}
                        className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#EF4444] disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {revoking === k.id ? "Revoking…" : "Revoke"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* API reference card */}
      <div className="command-panel p-5 flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">API Endpoints</h3>
        {[
          { method: "POST", path: "/api/v1/signals", scope: "signals:write", desc: "Submit exploit signal" },
          { method: "GET",  path: "/api/v1/protocols/:id/status", scope: "protocols:read", desc: "Protocol risk state" },
          { method: "GET",  path: "/api/v1/guard/check?protocol_id=", scope: "guard:check", desc: "Circuit-breaker check" },
          { method: "GET",  path: "/api/v1/incidents/:id", scope: "incidents:read", desc: "Incident + GenLayer decision" },
        ].map(ep => (
          <div key={ep.path} className="flex items-center gap-3 text-xs">
            <span className={`w-10 text-center font-bold font-mono-gl ${ep.method === "POST" ? "text-[#22C55E]" : "text-[#38BDF8]"}`}>
              {ep.method}
            </span>
            <code className="flex-1 font-mono-gl text-[#9AA7B8]">{ep.path}</code>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20">{ep.scope}</span>
            <span className="text-[#64748B] hidden sm:inline">{ep.desc}</span>
          </div>
        ))}
        <p className="text-[11px] text-[#64748B] mt-1">
          All endpoints require <code className="font-mono-gl text-[#9AA7B8]">Authorization: Bearer gl_live_…</code>
        </p>
      </div>
    </div>
  );
}

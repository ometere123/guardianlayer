"use client";

import { useState } from "react";
import { Globe, CheckCircle, XCircle, Plus, Trash2, Loader2, Bell, Zap, Copy } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

const ALL_EVENTS = [
  "incident.created",
  "incident.genlayer_pending",
  "incident.adjudicated",
  "incident.resolved",
  "protocol.threat_escalated",
  "*",
];

type Endpoint = {
  id: string; name: string; url: string; events: string[]; status: string; created_at: string;
};
type Delivery = {
  id: string; endpoint_id: string | null; event_type: string; status: string;
  response_code: number | null; delivered_at: string | null; created_at: string;
};

type Props = {
  endpoints: Endpoint[];
  deliveries: Delivery[];
  canManage: boolean;
  organisationId: string;
};

export function WebhookManager({ endpoints: initialEndpoints, deliveries, canManage }: Props) {
  const [endpoints, setEndpoints] = useState(initialEndpoints);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const receiverUrl = `${appUrl}/api/webhooks/receive`;

  async function handleSendTest() {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/webhooks/send-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = await res.json() as { ok?: boolean; message?: string; error?: string };
      setTestResult(json.ok ? "✓ Test event fired - check delivery log below" : (json.error ?? "Failed"));
    } catch (err) {
      setTestResult(String(err));
    } finally {
      setTestSending(false);
    }
  }
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>(["incident.adjudicated", "incident.created"]);

  function toggleEvent(ev: string) {
    setFormEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  }

  async function handleCreate() {
    if (!formName.trim() || !formUrl.trim() || formEvents.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), url: formUrl.trim(), events: formEvents }),
      });
      const json = await res.json() as { ok?: boolean; endpoint?: Endpoint; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to create webhook");
      } else {
        setEndpoints(prev => [json.endpoint!, ...prev]);
        setShowForm(false);
        setFormName(""); setFormUrl(""); setFormEvents(["incident.adjudicated", "incident.created"]);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      setEndpoints(prev => prev.filter(ep => ep.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">Webhooks</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            HMAC-SHA256 signed events delivered to your endpoints.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-[#38BDF8]/10 border border-[#38BDF8]/20 text-[#38BDF8] text-xs font-medium hover:bg-[#38BDF8]/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Endpoint
          </button>
        )}
      </div>

      {/* Built-in test receiver */}
      <div className="command-panel p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Built-in Test Receiver</p>
        <p className="text-[11px] text-[#64748B]">
          Add this URL as an endpoint to verify HMAC-SHA256 delivery end-to-end. Events are logged in the dev server console.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs font-mono-gl text-[#38BDF8] bg-[#070A12] border border-[#243044] px-3 py-2 rounded-[8px] truncate">
            {receiverUrl || "/api/webhooks/receive"}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(receiverUrl)}
            className="p-2 rounded-[6px] border border-[#243044] text-[#64748B] hover:text-[#F4F7FB] transition-colors"
            title="Copy URL"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendTest}
              disabled={testSending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] text-xs font-medium hover:bg-[#8B5CF6]/20 transition-colors disabled:opacity-50"
            >
              {testSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {testSending ? "Sending…" : "Send test incident.adjudicated event"}
            </button>
            {testResult && <p className="text-xs text-[#22C55E]">{testResult}</p>}
          </div>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="command-panel p-5 flex flex-col gap-4">
          <p className="text-sm font-semibold text-[#F4F7FB]">New Webhook Endpoint</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-[#64748B] block mb-1">Name</label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="My Alerting Endpoint"
                className="w-full px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
            <div>
              <label className="text-xs text-[#64748B] block mb-1">URL</label>
              <input
                value={formUrl}
                onChange={e => setFormUrl(e.target.value)}
                placeholder="https://your-service.example.com/webhook"
                className="w-full px-3 py-2 rounded-[8px] bg-[#070A12] border border-[#243044] text-sm text-[#F4F7FB] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
            <div>
              <label className="text-xs text-[#64748B] block mb-2">Events</label>
              <div className="flex flex-wrap gap-2">
                {ALL_EVENTS.map(ev => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggleEvent(ev)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      formEvents.includes(ev)
                        ? "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30"
                        : "bg-transparent text-[#64748B] border-[#243044] hover:border-[#38BDF8]/30"
                    }`}
                  >
                    {ev}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-xs text-[#EF4444]">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#38BDF8] text-[#070A12] text-sm font-semibold hover:bg-[#7DD3FC] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Save Endpoint"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[#64748B] hover:text-[#9AA7B8]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Endpoints list */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-3.5 h-3.5" /> Endpoints ({endpoints.length})
        </h2>
        {endpoints.length === 0 ? (
          <div className="command-panel p-8 text-center">
            <Bell className="w-8 h-8 text-[#243044] mx-auto mb-3" />
            <p className="text-sm text-[#64748B]">No webhook endpoints configured.</p>
          </div>
        ) : (
          endpoints.map(ep => (
            <div key={ep.id} className="command-panel p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-[#F4F7FB]">{ep.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ep.status === "active" ? "text-[#22C55E] border-[#22C55E]/20 bg-[#14261a]" : "text-[#64748B] border-[#243044]"}`}>
                    {ep.status}
                  </span>
                </div>
                <p className="text-xs font-mono-gl text-[#64748B] truncate">{ep.url}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ep.events.map(ev => (
                    <span key={ev} className="text-[10px] px-2 py-0.5 rounded-full bg-[#0f1218] border border-[#243044] text-[#64748B]">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => handleDelete(ep.id)}
                  disabled={deleting === ep.id}
                  className="p-1.5 rounded-[6px] text-[#64748B] hover:text-[#EF4444] hover:bg-[#2a0a0a] transition-colors"
                >
                  {deleting === ep.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delivery log */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-[#9AA7B8] uppercase tracking-wider">Recent Deliveries</h2>
        {deliveries.length === 0 ? (
          <p className="text-sm text-[#64748B]">No deliveries yet.</p>
        ) : (
          <div className="command-panel overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#243044]">
                  {["Event", "Status", "Code", "Delivered"].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deliveries.map(d => (
                  <tr key={d.id} className="border-b border-[#243044]/50">
                    <td className="px-4 py-3 font-mono-gl text-[#9AA7B8]">{d.event_type}</td>
                    <td className="px-4 py-3">
                      {d.status === "delivered"
                        ? <CheckCircle className="w-3.5 h-3.5 text-[#22C55E]" />
                        : <XCircle className="w-3.5 h-3.5 text-[#EF4444]" />}
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{d.response_code ?? "-"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{formatTimeAgo(d.delivered_at ?? d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

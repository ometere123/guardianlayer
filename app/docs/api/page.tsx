import Link from "next/link";
import { GuardianLayerLogo } from "@/components/brand/GuardianLayerLogo";
import { Key, Radio, Shield, AlertTriangle, Activity } from "lucide-react";

export const metadata = { title: "API Documentation - Guardian Layer" };

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/signals",
    scope: "signals:write",
    description: "Submit an exploit or risk signal for a monitored protocol.",
    body: `{
  "protocol_id": "uuid",
  "signal_type": "large_outflow | security_report | oracle_manipulation | ...",
  "severity_hint": "low | elevated | high | critical",
  "title": "Short description of the event",
  "summary": "Detailed evidence and context",
  "evidence_urls": ["https://..."],
  "tx_hashes": ["0x..."],
  "affected_contracts": ["0x..."]
}`,
    response: `{
  "ok": true,
  "signal_id": "uuid",
  "protocol_id": "uuid"
}`,
  },
  {
    method: "GET",
    path: "/api/v1/protocols/:id/status",
    scope: "protocols:read",
    description: "Get the current risk state and threat level of a protocol.",
    body: null,
    response: `{
  "protocol_id": "uuid",
  "name": "Aave V3 Ethereum",
  "current_status": "monitoring",
  "current_threat_level": "none",
  "current_recommended_action": "observe",
  "emergency_mode": "alert_only",
  "genlayer_registered": true
}`,
  },
  {
    method: "GET",
    path: "/api/v1/incidents/:id",
    scope: "incidents:read",
    description: "Get incident details including GenLayer verdict if adjudicated.",
    body: null,
    response: `{
  "id": "uuid",
  "title": "...",
  "status": "resolved",
  "threat_level": "high",
  "recommended_action": "soft_pause",
  "confidence_label": "high",
  "genlayer_tx_hash": "0x...",
  "verdict": { ... }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/guard/check",
    scope: "guard:check",
    description: "Quick guard check - returns whether risky actions should be blocked for a protocol.",
    body: null,
    response: `{
  "protocol_id": "uuid",
  "should_block": false,
  "threat_level": "none",
  "recommended_action": "observe"
}`,
  },
];

const signalTypes = [
  "large_outflow", "abnormal_withdrawal", "admin_wallet_change", "ownership_transfer",
  "pause_state_change", "contract_upgrade", "suspicious_approval", "bridge_drain_pattern",
  "security_report", "public_exploit_claim", "github_advisory", "oracle_manipulation",
  "flash_loan_attack", "reentrancy", "governance_attack", "price_manipulation",
  "api_submitted", "manual_report", "integration_compromise", "unknown",
];

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-[#070A12]">
      <nav className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-[#243044]">
        <Link href="/"><GuardianLayerLogo size="sm" /></Link>
        <div className="flex items-center gap-6">
          <Link href="/security" className="text-sm text-[#64748B] hover:text-[#F4F7FB]">Security</Link>
          <Link href="/privacy" className="text-sm text-[#64748B] hover:text-[#F4F7FB]">Privacy</Link>
          <Link href="/login" className="text-sm text-[#38BDF8]">Sign In</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <Key className="w-6 h-6 text-[#38BDF8]" />
          <h1 className="text-3xl font-bold font-display text-[#F4F7FB]">API Documentation</h1>
        </div>
        <p className="text-[#64748B] mb-8">
          Integrate Guardian Layer into your monitoring pipeline. All endpoints require a Bearer API key created in the dashboard.
        </p>

        {/* Authentication */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#F4F7FB] mb-4">Authentication</h2>
          <div className="command-panel p-5 flex flex-col gap-3">
            <p className="text-sm text-[#9AA7B8]">
              All API requests require a Bearer token in the Authorization header. Create keys at <code className="text-[#38BDF8] font-mono-gl">/app/api-keys</code> with the scopes you need.
            </p>
            <pre className="text-xs font-mono-gl text-[#9AA7B8] bg-[#070A12] border border-[#243044] rounded-[8px] p-4 overflow-x-auto">
{`curl -X POST https://guardianlayer.vercel.app/api/v1/signals \\
  -H "Authorization: Bearer gl_live_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{"protocol_id": "...", "signal_type": "security_report", ...}'`}
            </pre>
            <p className="text-xs text-[#64748B]">
              Keys are hashed on creation and cannot be recovered. Rate limit: 60 requests per minute per key.
            </p>
          </div>
        </section>

        {/* Endpoints */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#F4F7FB] mb-4">Endpoints</h2>
          <div className="flex flex-col gap-6">
            {endpoints.map((ep) => (
              <div key={ep.path} className="command-panel p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-1 rounded-[4px] ${ep.method === "POST" ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#38BDF8]/10 text-[#38BDF8]"}`}>
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono-gl text-[#F4F7FB]">{ep.path}</code>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#8B5CF6]/20 text-[#8B5CF6]">{ep.scope}</span>
                </div>
                <p className="text-sm text-[#9AA7B8]">{ep.description}</p>
                {ep.body && (
                  <div>
                    <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">Request Body</p>
                    <pre className="text-xs font-mono-gl text-[#9AA7B8] bg-[#070A12] border border-[#243044] rounded-[8px] p-3 overflow-x-auto">{ep.body}</pre>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">Response</p>
                  <pre className="text-xs font-mono-gl text-[#9AA7B8] bg-[#070A12] border border-[#243044] rounded-[8px] p-3 overflow-x-auto">{ep.response}</pre>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Signal Types */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#F4F7FB] mb-4">Signal Types</h2>
          <div className="command-panel p-5">
            <div className="flex flex-wrap gap-2">
              {signalTypes.map((t) => (
                <code key={t} className="text-xs font-mono-gl px-2 py-1 rounded-[6px] bg-[#070A12] border border-[#243044] text-[#9AA7B8]">{t}</code>
              ))}
            </div>
          </div>
        </section>

        {/* Severity Levels */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#F4F7FB] mb-4">Severity & Threat Levels</h2>
          <div className="command-panel p-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { level: "none", color: "text-[#64748B] border-[#243044]" },
                { level: "low", color: "text-[#22C55E] border-[#22C55E]/20" },
                { level: "elevated", color: "text-[#EAB308] border-[#EAB308]/20" },
                { level: "high", color: "text-[#F97316] border-[#F97316]/20" },
                { level: "critical", color: "text-[#EF4444] border-[#EF4444]/20" },
              ].map(({ level, color }) => (
                <div key={level} className={`text-center text-xs font-bold uppercase px-3 py-2 rounded-[8px] border ${color}`}>{level}</div>
              ))}
            </div>
          </div>
        </section>

        {/* Webhooks */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#F4F7FB] mb-4">Webhooks</h2>
          <div className="command-panel p-5 flex flex-col gap-3">
            <p className="text-sm text-[#9AA7B8]">
              Configure webhook endpoints in the dashboard to receive HMAC-SHA256 signed event notifications.
            </p>
            <div>
              <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">Available Events</p>
              <div className="flex flex-wrap gap-2">
                {["incident.created", "incident.genlayer_pending", "incident.adjudicated", "incident.resolved", "protocol.threat_escalated", "*"].map((ev) => (
                  <code key={ev} className="text-xs font-mono-gl px-2 py-1 rounded-[6px] bg-[#070A12] border border-[#243044] text-[#9AA7B8]">{ev}</code>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">Signature Verification</p>
              <pre className="text-xs font-mono-gl text-[#9AA7B8] bg-[#070A12] border border-[#243044] rounded-[8px] p-3 overflow-x-auto">
{`// Header: X-Guardian-Signature: sha256=<hex>
const expected = crypto
  .createHmac("sha256", WEBHOOK_SIGNING_SECRET)
  .update(rawBody)
  .digest("hex");
const valid = crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from("sha256=" + expected)
);`}
              </pre>
            </div>
          </div>
        </section>

        {/* Errors */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#F4F7FB] mb-4">Error Codes</h2>
          <div className="command-panel overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#243044]">
                  <th className="text-left text-[10px] font-semibold text-[#64748B] uppercase px-4 py-3">Code</th>
                  <th className="text-left text-[10px] font-semibold text-[#64748B] uppercase px-4 py-3">Meaning</th>
                </tr>
              </thead>
              <tbody className="text-xs text-[#9AA7B8]">
                {[
                  ["401", "Missing or invalid API key"],
                  ["403", "Key does not have the required scope"],
                  ["422", "Missing required field in request body"],
                  ["429", "Rate limit exceeded (60 req/min)"],
                  ["502", "GenLayer contract call failed"],
                ].map(([code, meaning]) => (
                  <tr key={code} className="border-b border-[#243044]/50">
                    <td className="px-4 py-3 font-mono-gl text-[#F4F7FB]">{code}</td>
                    <td className="px-4 py-3">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

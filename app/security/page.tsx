import Link from "next/link";
import { GuardianLayerLogo } from "@/components/brand/GuardianLayerLogo";
import { Shield, Lock, Key, Database, Eye, AlertTriangle, CheckCircle } from "lucide-react";

export const metadata = { title: "Security - Guardian Layer" };

const practices = [
  {
    icon: Lock,
    title: "Wallet Encryption",
    description: "All embedded wallet private keys are encrypted at rest using AES-256-GCM with scrypt key derivation. Each user's key is encrypted with a unique salt derived from their user ID. Private keys are never stored in plaintext, never logged, and never exposed in API responses or the dashboard.",
  },
  {
    icon: Database,
    title: "Row-Level Security",
    description: "Every database table is protected by Supabase Row-Level Security (RLS) policies. Users can only access data belonging to their organisation. Service role operations are isolated to server-side code and never exposed to the client.",
  },
  {
    icon: Key,
    title: "API Key Management",
    description: "API keys are hashed with SHA-256 plus a server-side pepper before storage. The raw key is shown exactly once at creation and cannot be recovered. Keys are scoped to specific permissions (signals:write, protocols:read, incidents:read, guard:check) and rate-limited to 60 requests per minute.",
  },
  {
    icon: Shield,
    title: "Injection Guard",
    description: "Guardian Layer enforces a strict separation between evidence and verdicts. 11 forbidden verdict field patterns are rejected server-side on all signal and incident submissions. Only the GenLayer AI consensus engine can set threat levels, recommended actions, and confidence labels. Supabase never decides the final emergency verdict.",
  },
  {
    icon: Eye,
    title: "Audit Trail",
    description: "Every security-relevant action is logged to an immutable audit ledger: protocol registrations, incident submissions, GenLayer adjudications, pause executions, team changes, and API key operations. Audit entries include the actor, target, action, timestamp, and metadata.",
  },
  {
    icon: AlertTriangle,
    title: "Webhook Integrity",
    description: "All webhook deliveries are signed with HMAC-SHA256 using a per-organisation signing secret. Recipients verify the X-Guardian-Signature header using constant-time comparison (crypto.timingSafeEqual) to prevent timing attacks.",
  },
];

const genLayerSecurity = [
  "GenLayer is the authoritative source of truth for emergency threat judgement",
  "Supabase mirrors the verdict but never overrides it",
  "On-chain adjudication is immutable and publicly verifiable on Studionet explorer",
  "Pause execution decisions are recorded on-chain via mark_pause_executed",
  "Per-user wallets sign transactions - no shared platform key",
  "Contract injection guards reject caller-provided verdict fields",
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#070A12]">
      <nav className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-[#243044]">
        <Link href="/"><GuardianLayerLogo size="sm" /></Link>
        <div className="flex items-center gap-6">
          <Link href="/docs/api" className="text-sm text-[#64748B] hover:text-[#F4F7FB]">API Docs</Link>
          <Link href="/privacy" className="text-sm text-[#64748B] hover:text-[#F4F7FB]">Privacy</Link>
          <Link href="/login" className="text-sm text-[#38BDF8]">Sign In</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-[#38BDF8]" />
          <h1 className="text-3xl font-bold font-display text-[#F4F7FB]">Security</h1>
        </div>
        <p className="text-[#64748B] mb-10">
          Guardian Layer is built for protocol security teams. Security is not a feature - it is the product.
        </p>

        {/* Practices */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#F4F7FB] mb-6">Security Practices</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {practices.map(({ icon: Icon, title, description }) => (
              <div key={title} className="command-panel p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#38BDF8]" />
                  <h3 className="text-sm font-bold text-[#F4F7FB]">{title}</h3>
                </div>
                <p className="text-xs text-[#9AA7B8] leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* GenLayer Source of Truth */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#F4F7FB] mb-4">GenLayer Source of Truth</h2>
          <div className="command-panel p-5 flex flex-col gap-3">
            {genLayerSecurity.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#9AA7B8]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Infrastructure */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#F4F7FB] mb-4">Infrastructure</h2>
          <div className="command-panel p-5 flex flex-col gap-4 text-sm text-[#9AA7B8]">
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold text-[#64748B] uppercase w-28 flex-shrink-0 mt-0.5">Hosting</span>
              <p>Deployed on Vercel with automatic TLS, DDoS protection, and edge caching. All traffic is encrypted in transit via HTTPS.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold text-[#64748B] uppercase w-28 flex-shrink-0 mt-0.5">Database</span>
              <p>Supabase (managed PostgreSQL) with row-level security, encrypted at rest, hosted in AWS with SOC 2 Type II compliance.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold text-[#64748B] uppercase w-28 flex-shrink-0 mt-0.5">Blockchain</span>
              <p>GenLayer Studionet (Chain ID 61999). Contract state is publicly verifiable. All adjudication transactions are recorded immutably.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold text-[#64748B] uppercase w-28 flex-shrink-0 mt-0.5">Email</span>
              <p>Transactional email via Brevo (formerly Sendinblue) with SPF/DKIM authentication.</p>
            </div>
          </div>
        </section>

        {/* Reporting */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#F4F7FB] mb-4">Responsible Disclosure</h2>
          <div className="command-panel p-5 text-sm text-[#9AA7B8]">
            <p>
              If you discover a security vulnerability in Guardian Layer, please report it responsibly. Email{" "}
              <a href="mailto:convertyourcodes@gmail.com" className="text-[#38BDF8] hover:underline">convertyourcodes@gmail.com</a>{" "}
              with details. We will acknowledge receipt within 48 hours and work to resolve confirmed issues promptly.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

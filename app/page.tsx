import Link from "next/link";
import { GuardianLayerLogo } from "@/components/brand/GuardianLayerLogo";
import {
  Shield,
  Radio,
  Cpu,
  ChevronRight,
  Lock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070A12] text-[#F4F7FB]">
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 bg-[#070A12]/90 backdrop-blur-md border-b border-[#243044]/60">
        <GuardianLayerLogo size="sm" />
        <div className="hidden md:flex items-center gap-8">
          {[["Security", "/security"], ["API Docs", "/docs/api"], ["Pricing", "/pricing"]].map(([label, href]) => (
            <Link key={href} href={href} className="text-sm text-[#9AA7B8] hover:text-[#F4F7FB] transition-colors">
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[#9AA7B8] hover:text-[#F4F7FB] transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-[8px] bg-[#38BDF8] text-[#070A12] text-sm font-bold hover:bg-[#7DD3FC] transition-colors"
          >
            Start Monitoring
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
        {/* Grid bg */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#38BDF8 1px, transparent 1px), linear-gradient(90deg, #38BDF8 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-24 left-1/4 w-96 h-96 bg-[#38BDF8]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-32 right-1/4 w-80 h-80 bg-[#8B5CF6]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left copy */}
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#071e2e] border border-[#38BDF8]/20 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-blink" />
              <span className="text-xs text-[#38BDF8] font-medium">Powered by GenLayer Validator Consensus</span>
            </div>

            <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold font-display leading-[1.08] tracking-tight">
              <span>MONITOR THE</span><br />
              <span>THREAT. PROVE</span><br />
              <span className="gradient-cyan">THE RISK.</span><br />
              <span>LET </span>
              <span className="gradient-violet">GENLAYER</span><br />
              <span>DECIDE THE PAUSE.</span>
            </h1>

            <p className="text-[#9AA7B8] text-lg leading-relaxed max-w-xl">
              GUARDIAN LAYER is a GenLayer-powered security response layer for Web3 companies.
              It monitors exploit signals, explorer activity, and submitted threat events, then uses
              validator consensus to decide whether your protocol should alert, soft-pause, hard-pause,
              or keep observing.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/signup"
                className="flex items-center gap-2 px-6 py-3 rounded-[8px] bg-[#38BDF8] text-[#070A12] font-bold text-sm hover:bg-[#7DD3FC] transition-colors"
              >
                Start Monitoring <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/docs/api"
                className="flex items-center gap-2 px-6 py-3 rounded-[8px] bg-transparent text-[#F4F7FB] font-medium text-sm border border-[#243044] hover:border-[#38BDF8]/40 transition-colors"
              >
                View API Docs <ExternalLink className="w-4 h-4 opacity-60" />
              </Link>
            </div>
          </div>

          {/* Right: command preview card */}
          <div className="relative">
            <div className="command-panel p-6 space-y-4 glow-cyan">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-blink" />
                  <span className="text-xs font-semibold text-[#EF4444] uppercase tracking-widest">
                    Guardian State: CRITICAL
                  </span>
                </div>
                <span className="text-[10px] font-mono-gl text-[#64748B]">inc_0x8f2a</span>
              </div>
              <div className="border-t border-[#243044]" />
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Protocol",     value: "Atlas Bridge",  red: false, cyan: false },
                  { label: "Threat Level", value: "CRITICAL",      red: true,  cyan: false },
                  { label: "Rec. Action",  value: "HARD PAUSE",    red: true,  cyan: false },
                  { label: "Confidence",   value: "HIGH",          red: false, cyan: true  },
                ].map(({ label, value, red, cyan }) => (
                  <div key={label} className="bg-[#121827] rounded-[10px] p-3">
                    <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1">{label}</p>
                    <p className={`text-sm font-bold font-display ${red ? "text-[#EF4444]" : cyan ? "text-[#38BDF8]" : "text-[#F4F7FB]"}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="bg-[#0a0818] border border-[#8B5CF6]/30 rounded-[10px] p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span className="text-xs font-semibold text-[#8B5CF6]">GenLayer Consensus</span>
                  <span className="ml-auto text-[10px] text-[#22C55E] font-medium">Confirmed</span>
                </div>
                <p className="text-xs text-[#9AA7B8] leading-relaxed">
                  Explorer activity and public reports support an active vault-drain pattern.
                  Hard pause is recommended.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Explorer Activity", "Public Report", "Admin Wallet Signal"].map((e) => (
                  <span key={e} className="text-[10px] px-2 py-1 rounded-full bg-[#121827] border border-[#243044] text-[#9AA7B8]">
                    {e}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Lock className="w-3 h-3 text-[#64748B]" />
                <span className="text-[10px] text-[#64748B] font-mono-gl">
                  Source of truth: GenLayer Intelligent Contract
                </span>
              </div>
            </div>
            {/* Floating cards */}
            <div className="absolute -left-6 top-16 hidden xl:block animate-fade-in-up">
              <div className="bg-[#0D111C] border border-[#243044] rounded-[10px] p-3 w-44 shadow-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Radio className="w-3 h-3 text-[#EAB308]" />
                  <span className="text-[10px] text-[#EAB308]">Signal Detected</span>
                </div>
                <p className="text-[11px] text-[#9AA7B8]">Large vault outflow detected</p>
              </div>
            </div>
            <div className="absolute -right-4 bottom-12 hidden xl:block animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <div className="bg-[#0D111C] border border-[#8B5CF6]/30 rounded-[10px] p-3 w-40 shadow-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-3 h-3 text-[#8B5CF6]" />
                  <span className="text-[10px] text-[#8B5CF6]">GenLayer</span>
                </div>
                <p className="text-[11px] text-[#9AA7B8]">Consensus finalized</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem section ── */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-[#F4F7FB] mb-4">
            Exploit response should not depend on panic, rumours, or one private model.
          </h2>
          <p className="text-[#64748B] max-w-2xl mx-auto">
            Real protocol incidents arrive messy, fast, and uncertain. GUARDIAN LAYER gives
            you an evidence-backed decision layer.
          </p>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { icon: Radio,         title: "Signals arrive messy",          desc: "Multiple conflicting sources, partial information, noise alongside real threats." },
            { icon: AlertTriangle, title: "False alarms are expensive",    desc: "Unnecessary pauses damage trust, drain TVL, and create brand risk." },
            { icon: Zap,           title: "Delayed pauses drain treasuries",desc: "Every second of active exploit means compounding loss." },
            { icon: Shield,        title: "Internal response is too slow", desc: "Manual security decisions under pressure miss the window." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="command-panel p-5 rail-cyan">
              <Icon className="w-5 h-5 text-[#38BDF8] mb-3" />
              <h3 className="text-sm font-semibold text-[#F4F7FB] mb-2">{title}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-[#38BDF8] uppercase tracking-widest">How It Works</span>
          <h2 className="text-2xl md:text-3xl font-bold font-display text-[#F4F7FB] mt-2">
            From signal to consensus-backed decision
          </h2>
        </div>
        <div className="flex flex-col gap-0 max-w-2xl mx-auto">
          {[
            { n: "01", label: "Connect protocol",          detail: "Register your protocol, add monitored contract addresses, and configure your pause policy." },
            { n: "02", label: "Monitor signals",           detail: "Submit exploit signals via API, dashboard, or future monitoring integrations." },
            { n: "03", label: "Escalate serious incident", detail: "Cluster related signals into an incident and build the evidence packet." },
            { n: "04", label: "GenLayer adjudicates",      detail: "Validators review explorer evidence, public reports, admin wallet signals, and your pause policy." },
            { n: "05", label: "Distribute action state",   detail: "Webhook events, API guard checks, and dashboard status all reflect the consensus verdict." },
            { n: "06", label: "Company pauses safely",     detail: "Your app calls /v1/guard/check before risky actions. GenLayer consensus blocks or allows." },
          ].map(({ n, label, detail }, i) => (
            <div key={n} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#121827] border border-[#243044] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold font-mono-gl text-[#38BDF8]">{n}</span>
                </div>
                {i < 5 && <div className="w-px flex-1 bg-[#243044] my-1" />}
              </div>
              <div className="pb-6">
                <p className="text-sm font-semibold text-[#F4F7FB]">{label}</p>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why GenLayer ── */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="command-panel p-8 md:p-12 glow-violet">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-semibold text-[#8B5CF6] uppercase tracking-widest">Why GenLayer</span>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-[#F4F7FB] mt-3 mb-6">
                The judgement that<br />
                <span className="gradient-violet">ordinary contracts cannot make</span>
              </h2>
              <p className="text-[#9AA7B8] leading-relaxed mb-6">
                Your backend collects the signals. Supabase stores the operational state.
                GenLayer adjudicates the emergency decision.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  "Is this public exploit report credible?",
                  "Does the explorer activity support the claim?",
                  "Should we soft-pause or hard-pause?",
                  "Is this a false alarm?",
                ].map((q) => (
                  <div key={q} className="flex items-start gap-2">
                    <Cpu className="w-4 h-4 text-[#8B5CF6] mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-[#9AA7B8]">{q}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: "Your backend + API signals",                          color: "#38BDF8", Icon: Radio,        highlight: false },
                { label: "GUARDIAN LAYER builds evidence packet",               color: "#38BDF8", Icon: Shield,       highlight: false },
                { label: "GenLayer adjudicates - validators reach consensus",   color: "#8B5CF6", Icon: Cpu,          highlight: true  },
                { label: "Decision: HARD PAUSE / SOFT PAUSE / OBSERVE",        color: "#22C55E", Icon: CheckCircle2, highlight: false },
                { label: "API guard check returns allowed: false",              color: "#EF4444", Icon: Lock,         highlight: false },
              ].map(({ label, color, Icon, highlight }, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className={`mt-0.5 w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0 ${highlight ? "bg-[#8B5CF6]/20 border border-[#8B5CF6]/30" : "bg-[#121827] border border-[#243044]"}`}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${highlight ? "font-semibold text-[#F4F7FB]" : "text-[#9AA7B8]"}`}>{label}</p>
                    {i < 4 && <div className="w-px h-3 bg-[#243044] ml-3.5 mt-1" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Integration preview ── */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-[#38BDF8] uppercase tracking-widest">API Integration</span>
          <h2 className="text-2xl md:text-3xl font-bold font-display text-[#F4F7FB] mt-2">
            One API call before every risky action
          </h2>
        </div>
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#0D111C] border border-[#243044] rounded-[16px] overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[#243044] bg-[#121827]">
              <span className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
              <span className="w-3 h-3 rounded-full bg-[#EAB308]/60" />
              <span className="w-3 h-3 rounded-full bg-[#22C55E]/60" />
              <span className="ml-2 text-xs text-[#64748B] font-mono-gl">guard-check.ts</span>
            </div>
            <pre className="p-6 text-sm font-mono-gl text-[#9AA7B8] overflow-x-auto leading-relaxed whitespace-pre-wrap">
{`const res = await fetch(
  "https://api.guardianlayer.xyz/v1/guard/check",
  { headers: { Authorization: \`Bearer \${GL_API_KEY}\` } }
);

const guard = await res.json();

// guard.allowed === false when GenLayer says pause
if (!guard.allowed) {
  throw new Error("Action blocked by GUARDIAN LAYER");
}

// guard.source === "genlayer_consensus"`}
            </pre>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 md:px-12 text-center">
        <h2 className="text-2xl md:text-4xl font-bold font-display text-[#F4F7FB] mb-4">
          Build a security response layer<br />
          <span className="gradient-cyan">your users can verify.</span>
        </h2>
        <p className="text-[#64748B] mb-8 max-w-lg mx-auto">
          Join Web3 companies using GUARDIAN LAYER to convert messy exploit signals
          into auditable, consensus-backed pause decisions.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-[8px] bg-[#38BDF8] text-[#070A12] font-bold text-base hover:bg-[#7DD3FC] transition-colors"
        >
          Create Company Account <ChevronRight className="w-5 h-5" />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#243044] py-10 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <GuardianLayerLogo size="sm" />
          <p className="text-xs text-[#64748B] font-mono-gl">
            Powered by GenLayer Studionet · Chain ID 61999
          </p>
          <div className="flex gap-6">
            {[["Security", "/security"], ["API Docs", "/docs/api"], ["Privacy", "/privacy"]].map(([label, href]) => (
              <Link key={href} href={href} className="text-xs text-[#64748B] hover:text-[#9AA7B8] transition-colors">{label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

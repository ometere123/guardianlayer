import Link from "next/link";
import { GuardianLayerLogo } from "@/components/brand/GuardianLayerLogo";
import { FileText } from "lucide-react";

export const metadata = { title: "Privacy Policy - Guardian Layer" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#070A12]">
      <nav className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-[#243044]">
        <Link href="/"><GuardianLayerLogo size="sm" /></Link>
        <div className="flex items-center gap-6">
          <Link href="/security" className="text-sm text-[#64748B] hover:text-[#F4F7FB]">Security</Link>
          <Link href="/docs/api" className="text-sm text-[#64748B] hover:text-[#F4F7FB]">API Docs</Link>
          <Link href="/login" className="text-sm text-[#38BDF8]">Sign In</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6 text-[#38BDF8]" />
          <h1 className="text-3xl font-bold font-display text-[#F4F7FB]">Privacy Policy</h1>
        </div>
        <p className="text-[#64748B] mb-10">Last updated: June 21, 2026</p>

        <div className="flex flex-col gap-8">
          <Section title="1. What We Collect">
            <p>When you create an account, we collect your email address, display name, and a password (hashed, never stored in plaintext). When you create an organisation, we store the organisation name and your role.</p>
            <p>When you use the platform, we collect:</p>
            <ul>
              <li>Protocol configurations and monitored contract addresses you register</li>
              <li>Signals and incident reports you submit</li>
              <li>API key metadata (name, scopes, creation date - never the raw key)</li>
              <li>Webhook endpoint URLs and delivery logs</li>
              <li>Audit log entries of actions taken within the platform</li>
            </ul>
            <p>We generate an embedded blockchain wallet for each user. The private key is encrypted with AES-256-GCM and stored encrypted. We cannot access your private key.</p>
          </Section>

          <Section title="2. What We Do Not Collect">
            <ul>
              <li>We do not collect personal financial data, bank details, or payment information</li>
              <li>We do not use cookies for advertising or third-party tracking</li>
              <li>We do not sell, rent, or share your data with third parties for marketing</li>
              <li>We do not store plaintext passwords or private keys</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Data">
            <ul>
              <li>To provide the Guardian Layer security monitoring service</li>
              <li>To submit transactions to the GenLayer Studionet blockchain on your behalf</li>
              <li>To send you critical security alert emails when high or critical verdicts are issued</li>
              <li>To deliver webhook events to your configured endpoints</li>
              <li>To maintain an audit trail of security actions for your organisation</li>
            </ul>
          </Section>

          <Section title="4. Blockchain Data">
            <p>When you register a protocol, submit an incident, or request adjudication, data is written to the GenLayer Studionet blockchain. Blockchain transactions are publicly visible and immutable - they cannot be deleted. This includes:</p>
            <ul>
              <li>Protocol registration records (protocol key, organisation hash, policy hash)</li>
              <li>Incident submissions (incident key, evidence hashes, signal type)</li>
              <li>AI adjudication verdicts (threat level, recommended action, reasoning)</li>
              <li>Pause execution records</li>
            </ul>
            <p>Hashes are derived from your data but do not contain the original content. The full evidence text is stored in Supabase, not on-chain.</p>
          </Section>

          <Section title="5. Data Storage & Security">
            <p>Your data is stored in Supabase (managed PostgreSQL hosted on AWS) with row-level security, encryption at rest, and encryption in transit. The application is hosted on Vercel with automatic TLS.</p>
            <p>See our <Link href="/security" className="text-[#38BDF8] hover:underline">Security page</Link> for detailed information about encryption, access controls, and infrastructure.</p>
          </Section>

          <Section title="6. Data Retention">
            <p>Account data is retained for as long as your account is active. Audit logs are retained indefinitely as part of the security record. If you delete your account, your personal data (email, display name, profile) will be removed, but blockchain transactions and audit logs are immutable and cannot be deleted.</p>
          </Section>

          <Section title="7. Third-Party Services">
            <ul>
              <li><strong>Supabase</strong> - database and authentication (SOC 2 Type II compliant)</li>
              <li><strong>Vercel</strong> - application hosting and CDN</li>
              <li><strong>GenLayer</strong> - blockchain smart contract execution (Studionet)</li>
              <li><strong>Brevo</strong> - transactional email delivery</li>
            </ul>
            <p>Each service processes data in accordance with their own privacy policies. No third party has access to your encrypted private keys.</p>
          </Section>

          <Section title="8. Your Rights">
            <p>You can:</p>
            <ul>
              <li>Access your data through the Guardian Layer dashboard</li>
              <li>Export your protocol and incident data via the API</li>
              <li>Request account deletion by contacting us</li>
              <li>Revoke team member access and API keys at any time</li>
            </ul>
          </Section>

          <Section title="9. Contact">
            <p>
              For privacy-related questions or requests, contact us at{" "}
              <a href="mailto:convertyourcodes@gmail.com" className="text-[#38BDF8] hover:underline">convertyourcodes@gmail.com</a>.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="command-panel p-6 flex flex-col gap-3">
      <h2 className="text-lg font-bold text-[#F4F7FB]">{title}</h2>
      <div className="text-sm text-[#9AA7B8] leading-relaxed flex flex-col gap-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_li]:text-[#9AA7B8]">
        {children}
      </div>
    </section>
  );
}

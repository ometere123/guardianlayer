import Link from "next/link";
import { GuardianLayerLogo } from "@/components/brand/GuardianLayerLogo";
import { Mail } from "lucide-react";

export const metadata = { title: "Verify Email" };

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#070A12] flex items-center justify-center px-4">
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#38BDF8 1px, transparent 1px), linear-gradient(90deg, #38BDF8 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <GuardianLayerLogo size="md" />
          </Link>
        </div>

        <div className="command-panel p-8 flex flex-col items-center gap-6 text-center">
          <div className="w-14 h-14 rounded-full bg-[#071e2e] border border-[#38BDF8]/20 flex items-center justify-center">
            <Mail className="w-6 h-6 text-[#38BDF8]" />
          </div>

          <div>
            <h1 className="text-xl font-bold font-display text-[#F4F7FB]">Check your inbox</h1>
            <p className="text-sm text-[#64748B] mt-2 leading-relaxed">
              We sent a verification link to your email address. Click the link to verify your account and continue to onboarding.
            </p>
          </div>

          <div className="w-full p-4 rounded-[10px] bg-[#121827] border border-[#243044]">
            <p className="text-xs text-[#64748B]">
              The link expires in 24 hours. Check your spam folder if you do not see it.
            </p>
          </div>

          <Link href="/login" className="text-sm text-[#38BDF8] hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

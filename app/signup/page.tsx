import Link from "next/link";
import { GuardianLayerLogo } from "@/components/brand/GuardianLayerLogo";
import { signUp } from "@/lib/auth/actions";
import { AuthAlert } from "@/components/auth/AuthAlert";

export const metadata = { title: "Create Account" };

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const errorMsg = params.error
    ? decodeURIComponent(params.error).replace(/_/g, " ")
    : null;

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

        <div className="command-panel p-8 flex flex-col gap-6">
          <div>
            <h1 className="text-xl font-bold font-display text-[#F4F7FB]">Create company account</h1>
            <p className="text-sm text-[#64748B] mt-1">
              You will receive a permanent embedded wallet after onboarding.
            </p>
          </div>

          {errorMsg && <AuthAlert message={errorMsg} />}

          <form action={signUp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="display_name" className="text-sm font-medium text-[#9AA7B8]">Full Name</label>
              <input
                id="display_name"
                type="text"
                name="display_name"
                placeholder="Jane Smith"
                required
                autoComplete="name"
                className="w-full h-10 px-3 rounded-[12px] text-sm bg-[#121827] border border-[#243044] text-[#F4F7FB] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-[#9AA7B8]">Company Email</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full h-10 px-3 rounded-[12px] text-sm bg-[#121827] border border-[#243044] text-[#F4F7FB] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-[#9AA7B8]">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Minimum 12 characters"
                required
                minLength={12}
                autoComplete="new-password"
                className="w-full h-10 px-3 rounded-[12px] text-sm bg-[#121827] border border-[#243044] text-[#F4F7FB] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 transition-colors"
              />
            </div>

            <div className="flex items-start gap-2 mt-1">
              <input
                type="checkbox"
                required
                id="terms"
                name="terms"
                className="mt-0.5 w-4 h-4 accent-[#38BDF8]"
              />
              <label htmlFor="terms" className="text-xs text-[#64748B]">
                I understand that a permanent embedded wallet will be generated for my account and organisation. The wallet is not replaceable without the recovery key.
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-[8px] bg-[#38BDF8] text-[#070A12] font-bold text-sm hover:bg-[#7DD3FC] transition-colors mt-2"
            >
              Create Account
            </button>
          </form>

          <div className="text-center text-sm text-[#64748B]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#38BDF8] hover:underline">
              Sign in
            </Link>
          </div>
        </div>

        <p className="text-center text-[10px] font-mono-gl text-[#243044] mt-6">
          GUARDIAN LAYER · GenLayer Studionet · 61999
        </p>
      </div>
    </div>
  );
}

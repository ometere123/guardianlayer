import Link from "next/link";
import { GuardianLayerLogo } from "@/components/brand/GuardianLayerLogo";
import { signIn } from "@/lib/auth/actions";
import { AuthAlert } from "@/components/auth/AuthAlert";

export const metadata = { title: "Sign In" };

interface Props {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
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
            <h1 className="text-xl font-bold font-display text-[#F4F7FB]">Sign in to Guardian Command</h1>
            <p className="text-sm text-[#64748B] mt-1">Enter your company email and password</p>
          </div>

          {errorMsg && <AuthAlert message={errorMsg} />}

          <form action={signIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-[#9AA7B8]">Email</label>
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
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-[#9AA7B8]">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#38BDF8] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full h-10 px-3 rounded-[12px] text-sm bg-[#121827] border border-[#243044] text-[#F4F7FB] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-[8px] bg-[#38BDF8] text-[#070A12] font-bold text-sm hover:bg-[#7DD3FC] transition-colors mt-2"
            >
              Sign In
            </button>
          </form>

          <div className="text-center text-sm text-[#64748B]">
            No account?{" "}
            <Link href="/signup" className="text-[#38BDF8] hover:underline">
              Create company account
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

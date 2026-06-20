import Link from "next/link";
import { GuardianLayerLogo } from "@/components/brand/GuardianLayerLogo";
import { resetPassword } from "@/lib/auth/actions";
import { AuthAlert } from "@/components/auth/AuthAlert";

export const metadata = { title: "Set New Password" };

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const errorMsg = params.error ? decodeURIComponent(params.error).replace(/_/g, " ") : null;

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
          <Link href="/"><GuardianLayerLogo size="md" /></Link>
        </div>

        <div className="command-panel p-8 flex flex-col gap-6">
          <div>
            <h1 className="text-xl font-bold font-display text-[#F4F7FB]">Set new password</h1>
            <p className="text-sm text-[#64748B] mt-1">
              Your embedded wallet address will remain unchanged.
            </p>
          </div>

          {errorMsg && <AuthAlert message={errorMsg} />}

          <form action={resetPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-[#9AA7B8]">New Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Minimum 12 characters"
                required
                minLength={12}
                autoComplete="new-password"
                className="w-full h-10 px-3 rounded-[12px] text-sm bg-[#121827] border border-[#243044] text-[#F4F7FB] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm" className="text-sm font-medium text-[#9AA7B8]">Confirm Password</label>
              <input
                id="confirm"
                type="password"
                name="confirm"
                placeholder="Repeat new password"
                required
                minLength={12}
                autoComplete="new-password"
                className="w-full h-10 px-3 rounded-[12px] text-sm bg-[#121827] border border-[#243044] text-[#F4F7FB] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8] transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full h-10 rounded-[8px] bg-[#38BDF8] text-[#070A12] font-bold text-sm hover:bg-[#7DD3FC] transition-colors"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

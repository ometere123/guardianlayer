import Link from "next/link";
import { redirect } from "next/navigation";
import { GuardianLayerLogo } from "@/components/brand/GuardianLayerLogo";
import { createOrganisation } from "@/lib/auth/actions";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AuthAlert } from "@/components/auth/AuthAlert";
import { Building2 } from "lucide-react";

export const metadata = { title: "Create Organisation" };

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function OnboardingPage({ searchParams }: Props) {
  const params = await searchParams;
  const errorMsg = params.error ? decodeURIComponent(params.error).replace(/_/g, " ") : null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const service = await createServiceClient();
  const { data: profile } = await service
    .from("user_profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) redirect("/app/overview");

  const { data: membership } = await service
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership?.organisation_id) redirect("/onboarding/wallet");

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

      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-8">
          <GuardianLayerLogo size="md" />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center mb-8">
          {["Organisation", "Wallet", "Done"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${i === 0 ? "bg-[#38BDF8] text-[#070A12]" : "bg-[#121827] border border-[#243044] text-[#64748B]"}`}>
                {i + 1}
              </div>
              <span className={`text-xs ${i === 0 ? "text-[#F4F7FB]" : "text-[#64748B]"}`}>{step}</span>
              {i < 2 && <div className="w-8 h-px bg-[#243044]" />}
            </div>
          ))}
        </div>

        <div className="command-panel p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[#071e2e] border border-[#38BDF8]/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#38BDF8]" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display text-[#F4F7FB]">Create your organisation</h1>
              <p className="text-sm text-[#64748B]">This is your company workspace in GUARDIAN LAYER.</p>
            </div>
          </div>

          {errorMsg && <AuthAlert message={errorMsg} />}

          <form action={createOrganisation} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-[#9AA7B8]">Organisation Name</label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="Atlas Labs"
                required
                maxLength={64}
                className="w-full h-10 px-3 rounded-[12px] text-sm bg-[#121827] border border-[#243044] text-[#F4F7FB] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 transition-colors"
              />
              <p className="text-xs text-[#64748B]">
                This is typically your company name. It can be changed later.
              </p>
            </div>

            <div className="p-4 rounded-[10px] bg-[#121827] border border-[#243044]">
              <p className="text-xs text-[#9AA7B8] leading-relaxed">
                <span className="text-[#38BDF8] font-semibold">Next: </span>
                After creating your organisation, GUARDIAN LAYER will generate a permanent embedded wallet. This wallet is your on-chain identity for GenLayer protocol registration and incident submissions.
              </p>
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-[8px] bg-[#38BDF8] text-[#070A12] font-bold text-sm hover:bg-[#7DD3FC] transition-colors"
            >
              Create Organisation →
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#64748B] mt-4">
          Already done?{" "}
          <Link href="/app/overview" className="text-[#38BDF8] hover:underline">Go to dashboard</Link>
        </p>
      </div>
    </div>
  );
}

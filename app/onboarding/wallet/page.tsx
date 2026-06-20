import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GuardianLayerLogo } from "@/components/brand/GuardianLayerLogo";
import { WalletSetupPanel } from "@/components/wallet/WalletSetupPanel";

export const metadata = { title: "Wallet Setup" };

export default async function OnboardingWalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = await createServiceClient();

  // Get org
  const { data: membership } = await service
    .from("organisation_members")
    .select("organisation_id, organisations(id, name)")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  // Check for existing wallet
  const { data: existingWallet } = await service
    .from("wallets")
    .select("wallet_address, created_at")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

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
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                i === 0 ? "bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E]" :
                i === 1 ? "bg-[#38BDF8] text-[#070A12]" :
                "bg-[#121827] border border-[#243044] text-[#64748B]"
              }`}>
                {i === 0 ? "✓" : i + 1}
              </div>
              <span className={`text-xs ${i === 1 ? "text-[#F4F7FB]" : "text-[#64748B]"}`}>{step}</span>
              {i < 2 && <div className="w-8 h-px bg-[#243044]" />}
            </div>
          ))}
        </div>

        <WalletSetupPanel
          userId={user.id}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          orgId={(membership.organisations as any)?.id ?? membership.organisation_id}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          orgName={(membership.organisations as any)?.name ?? "Your Organisation"}
          existingWalletAddress={existingWallet?.wallet_address ?? null}
        />
      </div>
    </div>
  );
}

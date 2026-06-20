import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ApiKeyVault } from "@/components/api-keys/ApiKeyVault";
import { Key } from "lucide-react";

export const metadata = { title: "API Key Vault — Guardian Layer" };

export default async function ApiKeysPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = await createServiceClient();

  const membershipResult = await service
    .from("organisation_members")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const membership = membershipResult.data as { organisation_id: string; role: string } | null;
  if (!membership?.organisation_id) redirect("/onboarding");

  const { data: rawKeys } = await service
    .from("api_keys")
    .select("id, name, prefix, scopes, status, created_at, last_used_at, revoked_at")
    .eq("organisation_id", membership.organisation_id)
    .order("created_at", { ascending: false });

  const keys = (rawKeys ?? []) as Array<{
    id: string;
    name: string;
    prefix: string;
    scopes: string[];
    status: string;
    created_at: string;
    last_used_at: string | null;
    revoked_at: string | null;
  }>;

  const canManage = ["owner", "admin"].includes(membership.role);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Key className="w-5 h-5 text-[#38BDF8]" />
            <h1 className="text-2xl font-bold font-display text-[#F4F7FB]">API Key Vault</h1>
          </div>
          <p className="text-sm text-[#64748B]">
            Generate keys to integrate your protocol monitoring pipelines. Keys are hashed on creation and cannot be recovered.
          </p>
        </div>
      </div>

      {!canManage && (
        <div className="px-4 py-3 rounded-[10px] bg-[#1a1410] border border-[#F97316]/20 text-sm text-[#F97316]">
          Only owners and admins can manage API keys.
        </div>
      )}

      <ApiKeyVault initialKeys={keys} />
    </div>
  );
}

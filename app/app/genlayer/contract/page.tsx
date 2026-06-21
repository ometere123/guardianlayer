import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ContractStateViewer } from "@/components/genlayer/ContractStateViewer";

export const metadata = { title: "Contract State - Guardian Layer" };

export default async function ContractStatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = await createServiceClient();
  const membershipResult = await service
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const membership = membershipResult.data as { organisation_id: string } | null;
  if (!membership) redirect("/onboarding");

  const { data: protocols } = await service
    .from("protocols")
    .select("id, name, protocol_key, genlayer_protocol_registered")
    .eq("organisation_id", membership.organisation_id)
    .order("name");

  const { data: incidents } = await service
    .from("incidents")
    .select("id, title, incident_key, genlayer_tx_hash")
    .eq("organisation_id", membership.organisation_id)
    .not("genlayer_tx_hash", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <ContractStateViewer
      protocols={(protocols ?? []) as Array<{ id: string; name: string; protocol_key: string; genlayer_protocol_registered: boolean }>}
      incidents={(incidents ?? []) as Array<{ id: string; title: string; incident_key: string; genlayer_tx_hash: string | null }>}
    />
  );
}

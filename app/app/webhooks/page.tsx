import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { WebhookManager } from "@/components/webhooks/WebhookManager";

export const metadata = { title: "Webhooks — Guardian Layer" };

export default async function WebhooksPage() {
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

  const { data: rawEndpoints } = await service
    .from("webhook_endpoints")
    .select("id, name, url, events, status, created_at")
    .eq("organisation_id", membership.organisation_id)
    .order("created_at", { ascending: false });

  const { data: rawDeliveries } = await service
    .from("webhook_deliveries")
    .select("id, endpoint_id, event_type, status, response_code, delivered_at, created_at")
    .eq("organisation_id", membership.organisation_id)
    .order("created_at", { ascending: false })
    .limit(50);

  const endpoints = (rawEndpoints ?? []) as Array<{
    id: string; name: string; url: string; events: string[]; status: string; created_at: string;
  }>;
  const deliveries = (rawDeliveries ?? []) as Array<{
    id: string; endpoint_id: string | null; event_type: string; status: string;
    response_code: number | null; delivered_at: string | null; created_at: string;
  }>;

  const canManage = ["owner", "admin"].includes(membership.role);

  return (
    <WebhookManager
      endpoints={endpoints}
      deliveries={deliveries}
      canManage={canManage}
      organisationId={membership.organisation_id}
    />
  );
}

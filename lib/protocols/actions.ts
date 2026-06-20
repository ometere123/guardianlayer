"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/write";
import { slugify, generateKey } from "@/lib/utils";

export async function createProtocol(formData: FormData) {
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
  if (!["owner", "admin"].includes(membership.role)) redirect("/app/protocols");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const category = (formData.get("category") as string) || "defi";
  const chain = (formData.get("chain") as string) || "ethereum";
  const network = (formData.get("network") as string) || "mainnet";
  const website_url = (formData.get("website_url") as string)?.trim() || null;
  const github_url = (formData.get("github_url") as string)?.trim() || null;

  if (!name) return;

  const slug = slugify(name);
  const protocol_key = generateKey("prot");

  const { data: protocol, error } = await service
    .from("protocols")
    .insert({
      organisation_id: membership.organisation_id,
      protocol_key,
      name,
      slug,
      description,
      category,
      chain,
      network,
      website_url,
      github_url,
      emergency_mode: "alert_only",
      current_status: "monitoring",
      current_threat_level: "none",
      current_recommended_action: "observe",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !protocol) {
    const message = error?.message ?? "protocol_create_failed";
    redirect(`/app/protocols/new?error=${encodeURIComponent(message)}`);
  }

  // Create default pause policy
  const { error: policyError } = await service.from("pause_policies").insert({
    organisation_id: membership.organisation_id,
    protocol_id: protocol.id,
    emergency_mode: "alert_only",
    minimum_threat_for_soft_pause: "high",
    minimum_threat_for_hard_pause: "critical",
    requires_explorer_evidence: true,
    requires_multiple_sources_for_hard_pause: true,
    human_approval_required_for_hard_pause: true,
    incident_expiry_minutes: 60,
    webhook_alerts_enabled: true,
    hard_pause_enabled: false,
    created_by: user.id,
  });

  if (policyError) {
    redirect(`/app/protocols/new?error=${encodeURIComponent(policyError.message)}`);
  }

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "protocol.created",
    target_type: "protocol",
    target_id: protocol.id,
    metadata_json: { name, slug, category, chain, network },
  });

  redirect(`/app/protocols/${protocol.id}`);
}

export async function addMonitoredContract(formData: FormData) {
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
  if (!membership || !["owner", "admin"].includes(membership.role)) return;

  const protocol_id = formData.get("protocol_id") as string;
  const address = (formData.get("address") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim();
  const chain = (formData.get("chain") as string) || "ethereum";
  const network = (formData.get("network") as string) || "mainnet";
  const role = (formData.get("role") as string) || "other";
  const is_pause_capable = formData.get("is_pause_capable") === "true";
  const pause_function_name = (formData.get("pause_function_name") as string)?.trim() || null;

  if (!protocol_id || !address || !name) return;

  const { error } = await service.from("monitored_contracts").insert({
    organisation_id: membership.organisation_id,
    protocol_id,
    chain,
    network,
    address,
    name,
    role,
    is_pause_capable,
    pause_function_name,
  });

  if (error) {
    redirect(`/app/protocols/${protocol_id}?tab=contracts&error=${encodeURIComponent(error.message)}`);
  }

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "contract.added",
    target_type: "protocol",
    target_id: protocol_id,
    metadata_json: { address, name, chain, network, role },
  });

  revalidatePath(`/app/protocols/${protocol_id}`);
  redirect(`/app/protocols/${protocol_id}?tab=contracts`);
}

export async function updatePausePolicy(formData: FormData) {
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
  if (!membership || !["owner", "admin"].includes(membership.role)) return;

  const protocol_id = formData.get("protocol_id") as string;
  if (!protocol_id) return;

  const emergency_mode = formData.get("emergency_mode") as string;
  const minimum_threat_for_soft_pause = formData.get("minimum_threat_for_soft_pause") as string;
  const minimum_threat_for_hard_pause = formData.get("minimum_threat_for_hard_pause") as string;
  const hard_pause_enabled = formData.get("hard_pause_enabled") === "true";
  const human_approval_required_for_hard_pause = formData.get("human_approval_required_for_hard_pause") !== "false";
  const requires_explorer_evidence = formData.get("requires_explorer_evidence") !== "false";
  const requires_multiple_sources_for_hard_pause = formData.get("requires_multiple_sources_for_hard_pause") !== "false";
  const incident_expiry_minutes = parseInt(formData.get("incident_expiry_minutes") as string) || 60;
  const webhook_alerts_enabled = formData.get("webhook_alerts_enabled") !== "false";

  // Hash the policy for integrity tracking
  const { createHash } = await import("crypto");
  const policyPayload = JSON.stringify({
    emergency_mode, minimum_threat_for_soft_pause, minimum_threat_for_hard_pause,
    hard_pause_enabled, human_approval_required_for_hard_pause,
    requires_explorer_evidence, requires_multiple_sources_for_hard_pause,
    incident_expiry_minutes, webhook_alerts_enabled,
  });
  const policy_hash = createHash("sha256").update(policyPayload).digest("hex");

  await service.from("pause_policies").upsert({
    organisation_id: membership.organisation_id,
    protocol_id,
    emergency_mode,
    minimum_threat_for_soft_pause,
    minimum_threat_for_hard_pause,
    hard_pause_enabled,
    human_approval_required_for_hard_pause,
    requires_explorer_evidence,
    requires_multiple_sources_for_hard_pause,
    incident_expiry_minutes,
    webhook_alerts_enabled,
    policy_hash,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "protocol_id" });

  // Sync emergency_mode to protocol record
  await service
    .from("protocols")
    .update({ emergency_mode, updated_at: new Date().toISOString() })
    .eq("id", protocol_id)
    .eq("organisation_id", membership.organisation_id);

  await writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: "pause_policy.updated",
    target_type: "protocol",
    target_id: protocol_id,
    metadata_json: { emergency_mode, hard_pause_enabled, policy_hash },
  });

  redirect(`/app/protocols/${protocol_id}?tab=policy&saved=1`);
}

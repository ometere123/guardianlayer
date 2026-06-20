/**
 * Guardian Layer demo seed data.
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SEED_USER_ID
 *
 * Safe to run more than once. It uses the user's existing owner
 * organisation when present so the dashboard immediately shows the data.
 */

import { config } from "dotenv";
import { join } from "path";
config({ path: join(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { generateApiKey } from "../lib/api-keys/generate";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const USER_ID = process.env.SEED_USER_ID ?? "";

if (!USER_ID) {
  console.error("SEED_USER_ID not set in .env.local");
  process.exit(1);
}

async function main() {
  console.log("\nGuardian Layer Demo Seed");
  console.log(`User: ${USER_ID}\n`);

  console.log("Loading organisation...");
  const { data: existingMembership } = await supabase
    .from("organisation_members")
    .select("organisation_id, organisations(id, name)")
    .eq("user_id", USER_ID)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  let orgId = existingMembership?.organisation_id as string | undefined;
  let orgName = "Demo Protocol Labs";

  if (orgId) {
    orgName =
      ((existingMembership?.organisations as { name?: string } | null)?.name) ??
      orgName;
    console.log(`Using existing org: ${orgName} (${orgId})`);
  } else {
    const { data: org, error: orgErr } = await supabase
      .from("organisations")
      .upsert({
        name: orgName,
        slug: "demo-protocol-labs",
        owner_user_id: USER_ID,
        plan: "pro",
        status: "active",
      }, { onConflict: "slug" })
      .select("id, name")
      .single();

    if (orgErr || !org) {
      console.error("Org insert failed:", orgErr);
      process.exit(1);
    }

    orgId = org.id;
    orgName = org.name;
    console.log(`Created org: ${orgName} (${orgId})`);
  }

  await supabase.from("organisation_members").upsert({
    organisation_id: orgId,
    user_id: USER_ID,
    role: "owner",
  }, { onConflict: "organisation_id,user_id" });

  console.log("\nSeeding protocols...");
  const protocols = [
    {
      protocol_key: "demo-uniswap-v3",
      name: "Uniswap V3",
      slug: "demo-uniswap-v3",
      category: "defi",
      chain: "ethereum",
      network: "mainnet",
      description: "Automated market maker - demo instance",
      current_threat_level: "elevated",
      current_status: "under_review",
      current_recommended_action: "manual_review",
      genlayer_protocol_registered: false,
    },
    {
      protocol_key: "demo-aave-v3",
      name: "Aave V3",
      slug: "demo-aave-v3",
      category: "lending",
      chain: "ethereum",
      network: "mainnet",
      description: "Decentralised lending protocol - demo instance",
      current_threat_level: "none",
      current_status: "monitoring",
      current_recommended_action: "observe",
      genlayer_protocol_registered: false,
    },
    {
      protocol_key: "demo-bridge-eth-arb",
      name: "ETH to Arbitrum Bridge",
      slug: "demo-bridge-eth-arb",
      category: "bridge",
      chain: "arbitrum",
      network: "mainnet",
      description: "Official Arbitrum token bridge - demo instance",
      current_threat_level: "high",
      current_status: "pause_recommended",
      current_recommended_action: "soft_pause",
      genlayer_protocol_registered: false,
    },
  ];

  const protocolIds: Record<string, string> = {};

  for (const protocol of protocols) {
    const { data, error } = await supabase
      .from("protocols")
      .upsert({
        organisation_id: orgId,
        created_by: USER_ID,
        emergency_mode: "alert_only",
        ...protocol,
      }, { onConflict: "organisation_id,slug" })
      .select("id, slug")
      .single();

    if (error || !data) {
      console.error(`Protocol ${protocol.name} failed:`, error?.message);
      continue;
    }

    protocolIds[data.slug] = data.id;
    console.log(`${protocol.name} -> ${data.id}`);
  }

  console.log("\nSeeding signals...");
  const signals = [
    {
      protocol_id: protocolIds["demo-uniswap-v3"],
      source_type: "security_firm",
      signal_type: "price_manipulation",
      severity_hint: "high",
      title: "Suspicious flash loan activity on USDC/ETH pool",
      summary:
        "Large flash loans were observed on the USDC/ETH pool, followed by significant price deviation consistent with oracle manipulation attempts.",
      evidence_urls: ["https://etherscan.io/tx/0xdemo1", "https://dune.com/demo"],
      tx_hashes: ["0xdemo000000000000000000000000000000000000000000000000000000000001"],
      affected_contracts: ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
      status: "incident_created",
    },
    {
      protocol_id: protocolIds["demo-uniswap-v3"],
      source_type: "on_chain_monitor",
      signal_type: "anomaly",
      severity_hint: "medium",
      title: "Unusual liquidity removal from WBTC pool",
      summary:
        "Within a 4-minute window, 12% of WBTC/ETH pool liquidity was removed by wallets with no prior history.",
      evidence_urls: ["https://etherscan.io/demo"],
      tx_hashes: [],
      affected_contracts: ["0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"],
      status: "new",
    },
    {
      protocol_id: protocolIds["demo-bridge-eth-arb"],
      source_type: "threat_intel",
      signal_type: "exploit",
      severity_hint: "critical",
      title: "Bridge validator set compromise suspected",
      summary:
        "Threat intelligence suggests one or more validator keys in the bridge multisig may have been exposed. Immediate pause recommended.",
      evidence_urls: ["https://example.com/threat-intel", "https://example.com/postmortem"],
      tx_hashes: [],
      affected_contracts: [],
      status: "incident_created",
    },
  ];

  const signalIds: string[] = [];

  for (const signal of signals) {
    if (!signal.protocol_id) {
      console.log(`Skipped signal "${signal.title}" - missing protocol`);
      continue;
    }

    const { data, error } = await supabase
      .from("signals")
      .insert({
        organisation_id: orgId,
        submitted_by_user_id: USER_ID,
        source_hash: null,
        affected_wallets: [],
        ...signal,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error(`Signal insert failed: ${error?.message}`);
      continue;
    }

    signalIds.push(data.id);
    console.log(`${signal.title.slice(0, 48)} -> ${data.id}`);
  }

  console.log("\nSeeding pause policies...");
  for (const [slug, protocolId] of Object.entries(protocolIds)) {
    const isBridge = slug === "demo-bridge-eth-arb";
    const { error } = await supabase.from("pause_policies").upsert({
      organisation_id: orgId,
      protocol_id: protocolId,
      emergency_mode: isBridge ? "soft_pause" : "alert_only",
      minimum_threat_for_soft_pause: "high",
      minimum_threat_for_hard_pause: "critical",
      requires_explorer_evidence: true,
      requires_multiple_sources_for_hard_pause: true,
      human_approval_required_for_hard_pause: true,
      incident_expiry_minutes: 60,
      webhook_alerts_enabled: true,
      hard_pause_enabled: isBridge,
      created_by: USER_ID,
    }, { onConflict: "protocol_id" });

    if (error) console.error(`Pause policy failed for ${slug}:`, error.message);
  }

  const { data: authUser } = await supabase.auth.admin.getUserById(USER_ID);
  if (authUser.user?.email) {
    await supabase.from("user_profiles").upsert({
      id: USER_ID,
      email: authUser.user.email,
      display_name: authUser.user.email.split("@")[0],
      default_organisation_id: orgId,
      onboarding_completed: true,
    }, { onConflict: "id" });
    console.log("\nUser profile marked onboarded.");
  }

  const smokeProtocolId = protocolIds["demo-uniswap-v3"] ?? Object.values(protocolIds)[0];
  if (smokeProtocolId) {
    const { key, prefix, hash } = generateApiKey("live");
    const { error } = await supabase
      .from("api_keys")
      .insert({
        organisation_id: orgId,
        name: `Smoke test ${new Date().toISOString()}`,
        prefix,
        key_hash: hash,
        scopes: ["signals:write", "protocols:read", "incidents:read", "guard:check"],
        status: "active",
        created_by: USER_ID,
      });

    if (error) {
      console.error("Smoke API key insert failed:", error.message);
    } else {
      console.log("\nSmoke test credentials");
      console.log(`SMOKE_API_KEY=${key}`);
      console.log(`SMOKE_PROTOCOL_ID=${smokeProtocolId}`);
    }
  }

  console.log("\nSeed complete.");
  console.log(`Organisation: ${orgName} (${orgId})`);
  console.log(`Protocols: ${Object.keys(protocolIds).length}`);
  console.log(`Signals: ${signalIds.length}`);
  console.log("Open: http://localhost:3000/app/overview\n");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});

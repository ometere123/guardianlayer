/**
 * Deploy GuardianLayerProtocol to GenLayer Studionet.
 *
 * Usage:
 *   npx tsx scripts/deploy-contract.ts
 *
 * Required env vars (in .env.local):
 *   GENLAYER_DEPLOYER_PRIVATE_KEY   - 0x… private key of the deployer wallet
 *   GUARDIAN_LAYER_PLATFORM_WALLET_PRIVATE_KEY - platform wallet (becomes contract owner)
 *   NEXT_PUBLIC_GENLAYER_RPC_URL    - https://studio.genlayer.com/api
 *
 * After deployment, copy the contract address into:
 *   NEXT_PUBLIC_GUARDIAN_LAYER_CONTRACT_ADDRESS=0x…
 */

import { readFileSync } from "fs";
import { join } from "path";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus, type TransactionHash } from "genlayer-js/types";

// Load env manually (tsx doesn't auto-load .env.local)
import { config } from "dotenv";
config({ path: join(process.cwd(), ".env.local") });

async function main() {
  const deployerKey = (process.env.GENLAYER_DEPLOYER_PRIVATE_KEY ?? process.env.GUARDIAN_LAYER_DEPLOY_KEY) as `0x${string}`;

  if (!deployerKey) {
    console.error("❌  Set GENLAYER_DEPLOYER_PRIVATE_KEY in .env.local (the wallet that will own the contract)");
    process.exit(1);
  }

  const deployerAccount = createAccount(deployerKey);
  console.log(`🔐  Deployer/Owner:   ${deployerAccount.address}`);
  console.log(`🌐  Network:          GenLayer Studionet (chain 61999)`);
  console.log("");

  // Read contract source
  const contractPath = join(process.cwd(), "contracts", "GuardianLayerProtocol.py");
  const contractCode = readFileSync(contractPath, "utf-8");
  console.log(`📄  Contract:         ${contractPath}`);
  console.log(`📦  Code length:      ${contractCode.length} chars`);
  console.log("");

  const client = createClient({
    chain: studionet,
    account: deployerAccount,
  });

  console.log("🚀  Deploying GuardianLayerProtocol…");

  let deployHash: TransactionHash;
  try {
    deployHash = (await client.deployContract({
      code: contractCode,
      args: [],
      leaderOnly: false,
    })) as TransactionHash;
  } catch (err) {
    console.error("❌  Deployment transaction failed:", err);
    process.exit(1);
  }

  console.log(`📝  Deploy tx hash:   ${deployHash}`);
  console.log("⏳  Waiting for ACCEPTED status…");

  let receipt;
  try {
    receipt = await client.waitForTransactionReceipt({
      hash: deployHash,
      status: TransactionStatus.ACCEPTED,
      retries: 60,
      interval: 5000,
    });
  } catch (err) {
    console.error("❌  Waiting for receipt failed:", err);
    console.log(`    Check manually: https://explorer-studio.genlayer.com/tx/${deployHash}`);
    process.exit(1);
  }

  // Extract deployed contract address from receipt
  // GenLayer returns it in the transaction data
  const contractAddress =
    ((receipt as Record<string, unknown>).data as Record<string, unknown> | undefined)?.contract_address as string
    ?? (receipt as Record<string, unknown>).contract_address as string
    ?? (receipt as Record<string, unknown>).to as string
    ?? "unknown - check explorer";

  console.log("");
  console.log("✅  Deployment successful!");
  console.log(`📍  Contract address: ${contractAddress}`);
  console.log(`🔍  Explorer:         https://explorer-studio.genlayer.com/tx/${deployHash}`);
  console.log("");
  console.log("─────────────────────────────────────────────────────");
  console.log("Add to .env.local:");
  console.log(`NEXT_PUBLIC_GUARDIAN_LAYER_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("─────────────────────────────────────────────────────");

  // Verify by calling get_protocol_count()
  console.log("\n🔎  Verifying contract…");
  try {
    const count = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "get_protocol_count",
      args: [],
    });
    console.log(`✅  get_protocol_count() = ${count}  (expected 0)`);
  } catch (err) {
    console.warn("⚠️   Verification call failed (contract may still be initializing):", err);
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});

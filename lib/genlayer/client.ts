/**
 * GenLayer Studionet client factory + typed contract call helpers.
 * Used server-side only — never imported in browser code.
 *
 * Write helpers take the acting user's decrypted private key so each
 * transaction is signed by the user's own embedded wallet.
 * Read helpers use a keyless client (no signing needed).
 *
 * Contract address: NEXT_PUBLIC_GUARDIAN_LAYER_CONTRACT_ADDRESS
 * Method aliases: get_guard_state ≡ get_protocol_state,
 *                 get_decision_json ≡ get_incident
 */

import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus, type TransactionHash } from "genlayer-js/types";

function getContractAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_GUARDIAN_LAYER_CONTRACT_ADDRESS;
  if (!addr) throw new Error("NEXT_PUBLIC_GUARDIAN_LAYER_CONTRACT_ADDRESS is not set");
  return addr as `0x${string}`;
}

function getWriteClient(privateKey: `0x${string}`) {
  return createClient({ chain: studionet, account: createAccount(privateKey) });
}

function getReadClient() {
  return createClient({ chain: studionet });
}

// ── Write helpers ──────────────────────────────────────────────────────────

export async function glRegisterProtocol(privateKey: `0x${string}`, params: {
  protocol_key: string;
  organisation_hash: string;
  profile_hash: string;
  policy_hash: string;
  public_protocol_summary: string;
  emergency_mode: string;
  owner_wallet: string;
}) {
  const client = getWriteClient(privateKey);
  const address = getContractAddress();

  const hash = await client.writeContract({
    address,
    functionName: "register_protocol",
    args: [
      params.protocol_key,
      params.organisation_hash,
      params.profile_hash,
      params.policy_hash,
      params.public_protocol_summary,
      params.emergency_mode,
      params.owner_wallet,
    ],
    value: BigInt(0),
    leaderOnly: false,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: hash as TransactionHash,
    status: TransactionStatus.ACCEPTED,
    retries: 40,
    interval: 4000,
  });

  await waitForOnchainBoolean(() => glIsProtocolRegistered(params.protocol_key), "Protocol was not registered on GenLayer");

  return { hash: hash as string, receipt };
}

export async function glSubmitIncident(privateKey: `0x${string}`, params: {
  protocol_key: string;
  incident_key: string;
  signal_type: string;
  evidence_hash: string;
  evidence_summary_hash: string;
  evidence_refs_hash: string;
  affected_contracts_hash: string;
  public_incident_summary: string;
  severity_hint: string;
  source_count: number;
}) {
  const client = getWriteClient(privateKey);
  const address = getContractAddress();

  const hash = await client.writeContract({
    address,
    functionName: "submit_incident",
    args: [
      params.protocol_key,
      params.incident_key,
      params.signal_type,
      params.evidence_hash,
      params.evidence_summary_hash,
      params.evidence_refs_hash,
      params.affected_contracts_hash,
      params.public_incident_summary,
      params.severity_hint,
      params.source_count,
    ],
    value: BigInt(0),
    leaderOnly: false,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: hash as TransactionHash,
    status: TransactionStatus.ACCEPTED,
    retries: 40,
    interval: 4000,
  });

  await waitForOnchainBoolean(() => glIsIncidentSubmitted(params.incident_key), "Incident was not submitted on GenLayer");

  return { hash: hash as string, receipt };
}

export async function glAdjudicateIncident(privateKey: `0x${string}`, params: {
  incident_key: string;
  protocol_summary: string;
  pause_policy_summary: string;
  affected_contracts_summary: string;
  known_wallet_context: string;
  evidence_urls_json: string;
  tx_hashes_json: string;
  public_reports_json: string;
  api_signal_summary: string;
  manual_triage_summary: string;
}) {
  const client = getWriteClient(privateKey);
  const address = getContractAddress();

  const hash = await client.writeContract({
    address,
    functionName: "adjudicate_incident",
    args: [
      params.incident_key,
      params.protocol_summary,
      params.pause_policy_summary,
      params.affected_contracts_summary,
      params.known_wallet_context,
      params.evidence_urls_json,
      params.tx_hashes_json,
      params.public_reports_json,
      params.api_signal_summary,
      params.manual_triage_summary,
    ],
    value: BigInt(0),
    leaderOnly: false,
    consensusMaxRotations: 3,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: hash as TransactionHash,
    status: TransactionStatus.FINALIZED,
    retries: 80,
    interval: 5000,
  });

  let adjudicated = false;
  try {
    await waitForOnchainBoolean(() => glIsIncidentAdjudicated(params.incident_key), "Incident was not adjudicated on GenLayer", 12, 5000);
    adjudicated = true;
  } catch {
    adjudicated = false;
  }

  return { hash: hash as string, receipt, adjudicated };
}

export async function glMarkPauseExecuted(privateKey: `0x${string}`, params: {
  incident_key: string;
  execution_reference: string;
}) {
  const client = getWriteClient(privateKey);
  const address = getContractAddress();

  const hash = await client.writeContract({
    address,
    functionName: "mark_pause_executed",
    args: [params.incident_key, params.execution_reference],
    value: BigInt(0),
    leaderOnly: false,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: hash as TransactionHash,
    status: TransactionStatus.ACCEPTED,
    retries: 40,
    interval: 4000,
  });

  return { hash: hash as string, receipt };
}

// ── Read helpers (no signing required) ────────────────────────────────────

export type ProtocolState = {
  protocol_key: string;
  name: string;
  chain: string;
  current_threat_level: string;
  current_recommended_action: string;
  current_status: string;
  emergency_mode: string;
  incident_count: number;
  last_incident_key: string | null;
  genlayer_registered: boolean;
};

export type IncidentVerdict = {
  incident_key: string;
  protocol_key: string;
  evidence_hash: string;
  title: string;
  consensus_status: string;
  adjudicated: boolean;
  verdict_threat_level: string | null;
  verdict_recommended_action: string | null;
  verdict_confidence_label: string | null;
  verdict_support_level: string | null;
  verdict_reasoning: string | null;
  pause_executed: boolean;
  pause_execution_reference: string | null;
  submission_block: number;
  adjudication_block: number | null;
};

export async function glGetProtocolState(protocolKey: string): Promise<ProtocolState> {
  const client = getReadClient();
  const address = getContractAddress();
  let result: unknown;
  try {
    result = await client.readContract({ address, functionName: "get_guard_state", args: [protocolKey] });
  } catch {
    result = await client.readContract({ address, functionName: "get_protocol_state", args: [protocolKey] });
  }
  return result as ProtocolState;
}

export async function glGetIncident(incidentKey: string): Promise<IncidentVerdict> {
  const client = getReadClient();
  const address = getContractAddress();
  let result: unknown;
  try {
    result = await client.readContract({ address, functionName: "get_incident", args: [incidentKey] });
  } catch {
    const decisionJson = await client.readContract({ address, functionName: "get_decision_json", args: [incidentKey] });
    result = typeof decisionJson === "string" && decisionJson ? JSON.parse(decisionJson) : {};
  }
  return normalizeIncidentVerdict(incidentKey, result as Record<string, unknown>);
}

export async function glIsProtocolRegistered(protocolKey: string): Promise<boolean> {
  const client = getReadClient();
  const address = getContractAddress();
  const result = await client.readContract({ address, functionName: "is_protocol_registered", args: [protocolKey] });
  return result as unknown as boolean;
}

export async function glIsIncidentAdjudicated(incidentKey: string): Promise<boolean> {
  const client = getReadClient();
  const address = getContractAddress();
  const result = await client.readContract({ address, functionName: "is_incident_adjudicated", args: [incidentKey] });
  return result as unknown as boolean;
}

export async function glIsIncidentSubmitted(incidentKey: string): Promise<boolean> {
  const client = getReadClient();
  const address = getContractAddress();
  const result = await client.readContract({ address, functionName: "is_incident_submitted", args: [incidentKey] });
  return result as unknown as boolean;
}

// ── Utilities ──────────────────────────────────────────────────────────────

async function waitForOnchainBoolean(
  read: () => Promise<boolean>,
  message: string,
  attempts = 8,
  intervalMs = 3000
) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (await read()) return;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error(message);
}

function normalizeIncidentVerdict(incidentKey: string, raw: Record<string, unknown>): IncidentVerdict {
  return {
    incident_key: (raw.incident_id as string | undefined) ?? (raw.incident_key as string | undefined) ?? incidentKey,
    protocol_key: (raw.protocol_id as string | undefined) ?? (raw.protocol_key as string | undefined) ?? "",
    evidence_hash: (raw.evidence_hash as string | undefined) ?? "",
    title: (raw.title as string | undefined) ?? "",
    consensus_status: (raw.consensus_status as string | undefined) ?? (raw.final_status as string | undefined) ?? "",
    adjudicated: Boolean(raw.adjudicated ?? raw.final_status),
    verdict_threat_level: (raw.threat_level as string | undefined) ?? null,
    verdict_recommended_action: (raw.recommended_action as string | undefined) ?? null,
    verdict_confidence_label: (raw.confidence_label as string | undefined) ?? null,
    verdict_support_level: (raw.support_level as string | undefined) ?? null,
    verdict_reasoning: (raw.reasoning_summary as string | undefined) ?? null,
    pause_executed: Boolean(raw.pause_executed),
    pause_execution_reference: (raw.pause_execution_reference as string | undefined) ?? null,
    submission_block: Number(raw.submission_block ?? 0),
    adjudication_block: raw.adjudication_block == null ? null : Number(raw.adjudication_block),
  };
}

export function getExplorerTxUrl(txHash: string): string {
  const base = process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL ?? "https://explorer-studio.genlayer.com";
  return `${base}/tx/${txHash}`;
}

export function getExplorerContractUrl(address: string): string {
  const base = process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL ?? "https://explorer-studio.genlayer.com";
  return `${base}/address/${address}`;
}

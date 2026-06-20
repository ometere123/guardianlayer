import crypto from "crypto";
import type { Json } from "@/lib/supabase/types";

// Fields callers are NEVER allowed to supply — GenLayer is the only source of truth for these.
const FORBIDDEN_VERDICT_FIELDS = [
  "verdict",
  "hard_pause",
  "recommended_action",
  "threat_level",
  "confidence_label",
  "support_level",
  "genlayer_decision",
  "consensus_status",
  "source_of_truth",
  "pause_triggered",
  "emergency_verdict",
] as const;

export type InjectionGuardResult =
  | { ok: true }
  | { ok: false; field: string };

/** Server-side guard: rejects any payload that tries to inject verdict fields. */
export function checkInjectionGuard(payload: Record<string, unknown>): InjectionGuardResult {
  for (const field of FORBIDDEN_VERDICT_FIELDS) {
    if (field in payload) return { ok: false, field };
  }
  return { ok: true };
}

export type EvidenceInput = {
  protocol_id: string;
  incident_id: string;
  incident_key: string;
  title: string;
  summary: string;
  threat_level: string;
  signal_ids: string[];
  tx_hashes: string[];
  affected_contracts: string[];
  affected_wallets: string[];
  evidence_urls: string[];
  source_count: number;
  submitted_by: string;
  submitted_at: string;
};

export type EvidencePacket = {
  packet_json: Json;
  canonical_payload: string;
  evidence_hash: string;
};

/**
 * Builds a canonical, deterministic evidence packet for a given incident.
 * The canonical form is sorted-key JSON → SHA-256 hex.
 * The hash is what gets submitted to GenLayer as the source-of-truth reference.
 */
export function buildEvidencePacket(input: EvidenceInput): EvidencePacket {
  // Canonical form: sorted keys, no whitespace, no caller-injectable verdict fields
  const canonical: Record<string, unknown> = {
    affected_contracts: [...input.affected_contracts].sort(),
    affected_wallets: [...input.affected_wallets].sort(),
    evidence_urls: [...input.evidence_urls].sort(),
    incident_id: input.incident_id,
    incident_key: input.incident_key,
    protocol_id: input.protocol_id,
    signal_ids: [...input.signal_ids].sort(),
    source_count: input.source_count,
    submitted_at: input.submitted_at,
    submitted_by: input.submitted_by,
    summary: input.summary,
    threat_level: input.threat_level,
    title: input.title,
    tx_hashes: [...input.tx_hashes].sort(),
  };

  // Deterministic JSON: sorted keys
  const canonical_payload = JSON.stringify(
    Object.fromEntries(Object.entries(canonical).sort(([a], [b]) => a.localeCompare(b)))
  );

  const evidence_hash = crypto
    .createHash("sha256")
    .update(canonical_payload)
    .digest("hex");

  return {
    packet_json: canonical as Json,
    canonical_payload,
    evidence_hash,
  };
}

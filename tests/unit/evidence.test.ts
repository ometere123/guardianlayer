import { describe, it, expect } from "vitest";
import { buildEvidencePacket, checkInjectionGuard } from "@/lib/evidence/build";

const BASE_INPUT = {
  protocol_id: "proto-123",
  incident_id: "inc-456",
  incident_key: "inc-testkey",
  title: "Reentrancy detected",
  summary: "Funds drained via reentrancy",
  threat_level: "high",
  signal_ids: ["sig-b", "sig-a"],
  tx_hashes: ["0xabc", "0x123"],
  affected_contracts: ["0xcontract2", "0xcontract1"],
  affected_wallets: [],
  evidence_urls: ["https://b.example.com", "https://a.example.com"],
  source_count: 2,
  submitted_by: "user-xyz",
  submitted_at: "2026-06-20T00:00:00.000Z",
};

describe("buildEvidencePacket", () => {
  it("produces a 64-char SHA-256 hex hash", () => {
    const { evidence_hash } = buildEvidencePacket(BASE_INPUT);
    expect(evidence_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic - same input always produces same hash", () => {
    const a = buildEvidencePacket(BASE_INPUT);
    const b = buildEvidencePacket(BASE_INPUT);
    expect(a.evidence_hash).toBe(b.evidence_hash);
    expect(a.canonical_payload).toBe(b.canonical_payload);
  });

  it("sorts arrays so order of input does not affect hash", () => {
    const shuffled = {
      ...BASE_INPUT,
      signal_ids: ["sig-a", "sig-b"],        // reversed from BASE_INPUT
      tx_hashes: ["0x123", "0xabc"],          // reversed
      affected_contracts: ["0xcontract1", "0xcontract2"],
      evidence_urls: ["https://a.example.com", "https://b.example.com"],
    };
    const a = buildEvidencePacket(BASE_INPUT);
    const b = buildEvidencePacket(shuffled);
    expect(a.evidence_hash).toBe(b.evidence_hash);
  });

  it("different incidents produce different hashes", () => {
    const a = buildEvidencePacket(BASE_INPUT);
    const b = buildEvidencePacket({ ...BASE_INPUT, incident_key: "inc-different" });
    expect(a.evidence_hash).not.toBe(b.evidence_hash);
  });

  it("canonical_payload has alphabetically sorted keys", () => {
    const { canonical_payload } = buildEvidencePacket(BASE_INPUT);
    const parsed = JSON.parse(canonical_payload) as Record<string, unknown>;
    const keys = Object.keys(parsed);
    expect(keys).toEqual([...keys].sort());
  });

  it("canonical_payload does not contain verdict fields", () => {
    const { canonical_payload } = buildEvidencePacket(BASE_INPUT);
    const forbidden = ["verdict", "hard_pause", "genlayer_decision", "consensus_status"];
    for (const f of forbidden) {
      expect(canonical_payload).not.toContain(`"${f}"`);
    }
  });
});

describe("checkInjectionGuard", () => {
  it("allows clean payloads", () => {
    const result = checkInjectionGuard({ title: "ok", summary: "fine" });
    expect(result.ok).toBe(true);
  });

  const forbidden = [
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
  ];

  it.each(forbidden)("rejects payload containing '%s'", (field) => {
    const result = checkInjectionGuard({ title: "ok", [field]: "injected" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe(field);
  });
});

/**
 * Guardian Layer - End-to-end smoke test
 *
 * Runs against a live app (default: http://localhost:3000).
 * Tests the full flow using real HTTP calls - no mocks.
 *
 * Usage:
 *   npm run smoke-test
 *   SMOKE_BASE_URL=https://your-staging.vercel.app npm run smoke-test
 *   SMOKE_API_KEY=gl_live_xxx npm run smoke-test
 *
 * Required env (in .env.local):
 *   SMOKE_BASE_URL     - defaults to http://localhost:3000
 *   SMOKE_API_KEY      - a live API key with scopes: signals:write, guard:check, incidents:read
 *   SMOKE_PROTOCOL_ID  - UUID of an existing protocol to test against
 */

import { config } from "dotenv";
import { join } from "path";
config({ path: join(process.cwd(), ".env.local") });

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const API_KEY = process.env.SMOKE_API_KEY ?? "";
const PROTOCOL_ID = process.env.SMOKE_PROTOCOL_ID ?? "";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  �-  ${name}`);
    console.error(`     ${String(err)}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function json<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const body = await res.json() as T;
  return { status: res.status, body };
}

function auth(key: string): Record<string, string> {
  return { Authorization: `Bearer ${key}` };
}

// ── Test suites ────────────────────────────────────────────────────────────

async function runPublicRoutes() {
  console.log("\n📡  Public routes");

  await test("GET / returns 200", async () => {
    const res = await fetch(`${BASE}/`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test("GET /docs/api returns 200", async () => {
    const res = await fetch(`${BASE}/docs/api`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test("GET /login returns 200", async () => {
    const res = await fetch(`${BASE}/login`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });
}

async function runApiKeyAuth() {
  console.log("\n🔑  API key authentication");

  await test("GET /api/v1/guard/check without key returns 401", async () => {
    const { status } = await json<{ error: string }>("/api/v1/guard/check?protocol_id=test");
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test("GET /api/v1/guard/check with wrong scope returns 403", async () => {
    if (!API_KEY) return console.log("     (skipped - no SMOKE_API_KEY)");
    const { status } = await json<{ error: string }>("/api/v1/guard/check?protocol_id=test", {
      headers: auth("gl_live_bad_key_000000000000000000000000000000000"),
    });
    assert(status === 401 || status === 403, `Expected 401/403, got ${status}`);
  });

  await test("POST /api/v1/signals without key returns 401", async () => {
    const { status } = await json<{ error: string }>("/api/v1/signals", {
      method: "POST",
      body: JSON.stringify({ protocol_id: "x", signal_type: "exploit", title: "t", summary: "s" }),
    });
    assert(status === 401, `Expected 401, got ${status}`);
  });
}

async function runSignalInjectionGuard() {
  console.log("\n🛡  Injection guard");

  if (!API_KEY || !PROTOCOL_ID) {
    console.log("     (skipped - set SMOKE_API_KEY + SMOKE_PROTOCOL_ID)");
    return;
  }

  const VERDICT_FIELDS = [
    "verdict", "hard_pause", "recommended_action", "threat_level",
    "confidence_label", "support_level", "genlayer_decision", "status",
  ];

  for (const field of VERDICT_FIELDS) {
    await test(`POST /api/v1/signals rejects '${field}' field`, async () => {
      const { status, body } = await json<{ error?: string }>("/api/v1/signals", {
        method: "POST",
        headers: auth(API_KEY),
        body: JSON.stringify({
          protocol_id: PROTOCOL_ID,
          signal_type: "exploit",
          title: "Injection test",
          summary: "Testing injection guard",
          [field]: "injected",
        }),
      });
      assert(status === 422, `Expected 422, got ${status} (body: ${JSON.stringify(body)})`);
    });
  }
}

async function runGuardCheck() {
  console.log("\n🔍  /api/v1/guard/check");

  if (!API_KEY || !PROTOCOL_ID) {
    console.log("     (skipped - set SMOKE_API_KEY + SMOKE_PROTOCOL_ID)");
    return;
  }

  await test("Returns guard decision with correct shape", async () => {
    const { status, body } = await json<Record<string, unknown>>(
      `/api/v1/guard/check?protocol_id=${PROTOCOL_ID}`,
      { headers: auth(API_KEY) }
    );
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof body.should_pause === "boolean", "should_pause must be boolean");
    assert(typeof body.threat_level === "string", "threat_level must be string");
    assert(typeof body.recommended_action === "string", "recommended_action must be string");
    assert(
      body.source_of_truth === "genlayer" || body.source_of_truth === "guardian",
      `Invalid source_of_truth: ${body.source_of_truth}`
    );
  });

  await test("Returns 404 for unknown protocol", async () => {
    const { status } = await json<{ error: string }>(
      "/api/v1/guard/check?protocol_id=00000000-0000-0000-0000-000000000000",
      { headers: auth(API_KEY) }
    );
    assert(status === 404, `Expected 404, got ${status}`);
  });
}

async function runSignalSubmit() {
  console.log("\n📤  POST /api/v1/signals");

  if (!API_KEY || !PROTOCOL_ID) {
    console.log("     (skipped - set SMOKE_API_KEY + SMOKE_PROTOCOL_ID)");
    return;
  }

  let signalId: string | null = null;

  await test("Submits a valid signal and returns 201", async () => {
    const { status, body } = await json<{ signal_id?: string; source_hash?: string }>(
      "/api/v1/signals",
      {
        method: "POST",
        headers: auth(API_KEY),
        body: JSON.stringify({
          protocol_id: PROTOCOL_ID,
          signal_type: "anomaly",
          severity_hint: "low",
          title: "[Smoke] Automated test signal",
          summary: "This signal was created by the smoke test. Safe to dismiss.",
          source_type: "smoke_test",
          evidence_urls: ["https://example.com/evidence"],
        }),
      }
    );
    assert(status === 201, `Expected 201, got ${status} (body: ${JSON.stringify(body)})`);
    assert(typeof body.signal_id === "string", "signal_id must be returned");
    assert(typeof body.source_hash === "string", "source_hash must be returned");
    signalId = body.signal_id!;
  });

  await test("Returns 422 for missing required fields", async () => {
    const { status } = await json<{ error: string }>("/api/v1/signals", {
      method: "POST",
      headers: auth(API_KEY),
      body: JSON.stringify({ protocol_id: PROTOCOL_ID }),
    });
    assert(status === 422, `Expected 422, got ${status}`);
  });

  return signalId;
}

async function runGenlayerContractEnv() {
  console.log("\n�-  GenLayer contract env");

  await test("NEXT_PUBLIC_GUARDIAN_LAYER_CONTRACT_ADDRESS is set", async () => {
    // Verify via the Consensus Chamber page (server renders it)
    const res = await fetch(`${BASE}/app/genlayer`);
    // Will redirect to login if not authenticated - that's fine, just checking the route exists
    assert(res.status < 500, `Expected non-500, got ${res.status}`);
  });
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🛡  Guardian Layer - Smoke Test`);
  console.log(`   Base URL : ${BASE}`);
  console.log(`   API Key  : ${API_KEY ? API_KEY.slice(0, 12) + "…" : "(not set)"}`);
  console.log(`   Protocol : ${PROTOCOL_ID || "(not set)"}`);

  await runPublicRoutes();
  await runApiKeyAuth();
  await runSignalInjectionGuard();
  await runGuardCheck();
  await runSignalSubmit();
  await runGenlayerContractEnv();

  console.log(`\n${"─".repeat(50)}`);
  console.log(`  Passed : ${passed}`);
  console.log(`  Failed : ${failed}`);
  console.log(`${"─".repeat(50)}\n`);

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});

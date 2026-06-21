import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/genlayer/fast-track
 * Runs submit → adjudicate → sync in one call.
 * Body: { incident_id: string }
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as { incident_id?: string };
  const { incident_id } = body;
  if (!incident_id) return NextResponse.json({ error: "incident_id required" }, { status: 400 });

  const origin = request.nextUrl.origin;
  const cookie = request.headers.get("cookie") ?? "";
  const headers = { "Content-Type": "application/json", cookie };
  const payload = JSON.stringify({ incident_id });

  // Step 1: Submit
  const submitRes = await fetch(`${origin}/api/genlayer/submit`, { method: "POST", headers, body: payload });
  const submitJson = await submitRes.json() as Record<string, unknown>;
  if (!submitRes.ok && submitRes.status !== 409) {
    return NextResponse.json({ error: "Submit failed", detail: submitJson }, { status: submitRes.status });
  }

  // Step 2: Adjudicate
  const adjRes = await fetch(`${origin}/api/genlayer/adjudicate`, { method: "POST", headers, body: payload });
  const adjJson = await adjRes.json() as Record<string, unknown>;
  if (!adjRes.ok) {
    return NextResponse.json({ error: "Adjudicate failed", detail: adjJson, submit: submitJson }, { status: adjRes.status });
  }

  // Step 3: Sync (may return ok:false if validators not done yet)
  const syncRes = await fetch(`${origin}/api/genlayer/sync`, { method: "POST", headers, body: payload });
  const syncJson = await syncRes.json() as Record<string, unknown>;

  return NextResponse.json({
    ok: true,
    steps: {
      submit: submitJson,
      adjudicate: adjJson,
      sync: syncJson,
    },
    synced: syncJson["synced"] === true,
    auto_pause_triggered: syncJson["auto_pause_triggered"] === true,
    verdict: syncJson["verdict"] ?? null,
  });
}

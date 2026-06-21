import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * POST /api/webhooks/receive
 *
 * Built-in test receiver - verifies HMAC-SHA256 signature and echoes the event.
 * Use this URL as the endpoint when testing webhook delivery from this app to itself.
 *
 * In production you'd replace this with your own consumer service.
 * Signature header: X-Guardian-Signature: sha256=<hex>
 */
export async function POST(request: NextRequest) {
  const signingSecret = process.env.WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) {
    // No secret configured - accept but warn
    const body = await request.json();
    return NextResponse.json({ ok: true, verified: false, warning: "WEBHOOK_SIGNING_SECRET not set", received: body });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-guardian-signature") ?? "";

  const expected = "sha256=" + crypto
    .createHmac("sha256", signingSecret)
    .update(rawBody)
    .digest("hex");

  const valid = crypto.timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expected, "utf8")
  );

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { body = rawBody; }

  // Log to console so you can see it in the dev server terminal
  console.log("[webhook/receive] ✅ Verified event:", JSON.stringify(body, null, 2));

  return NextResponse.json({ ok: true, verified: true, received: body });
}

import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/guardian layer/i);
  });

  test("API docs page loads", async ({ page }) => {
    await page.goto("/docs/api");
    await expect(page.locator("h1, h2")).toContainText(/api|documentation/i);
  });

  test("verify-email page renders without crashing", async ({ page }) => {
    await page.goto("/verify-email");
    await expect(page).not.toHaveTitle(/500|error/i);
  });
});

test.describe("Route protection", () => {
  const protectedRoutes = [
    "/app/overview",
    "/app/protocols",
    "/app/signals",
    "/app/incidents",
    "/app/genlayer",
    "/app/audit-logs",
    "/app/webhooks",
    "/app/api-keys",
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects to /login when unauthenticated`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("API routes - unauthenticated rejections", () => {
  test("POST /api/v1/signals without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/v1/signals", {
      data: { protocol_id: "x", signal_type: "exploit", title: "t", summary: "s" },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/v1/guard/check without auth returns 401", async ({ request }) => {
    const res = await request.get("/api/v1/guard/check?protocol_id=x");
    expect(res.status()).toBe(401);
  });

  test("POST /api/genlayer/register without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/genlayer/register", {
      data: { protocol_id: "x" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/genlayer/submit without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/genlayer/submit", {
      data: { incident_id: "x" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/genlayer/adjudicate without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/genlayer/adjudicate", {
      data: { incident_id: "x" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/genlayer/sync without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/genlayer/sync", {
      data: { incident_id: "x" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Injection guard - API", () => {
  // These require a valid API key with signals:write scope
  const VERDICTS = [
    "verdict", "hard_pause", "recommended_action", "threat_level",
    "confidence_label", "support_level", "genlayer_decision", "status",
  ];

  for (const field of VERDICTS) {
    test(`POST /api/v1/signals rejects forbidden field '${field}'`, async ({ request }) => {
      const apiKey = process.env.SMOKE_API_KEY ?? "";
      const protocolId = process.env.SMOKE_PROTOCOL_ID ?? "00000000-0000-0000-0000-000000000000";
      if (!apiKey) {
        test.skip(!apiKey, "SMOKE_API_KEY not set");
        return;
      }
      const res = await request.post("/api/v1/signals", {
        headers: { Authorization: `Bearer ${apiKey}` },
        data: {
          protocol_id: protocolId,
          signal_type: "exploit",
          title: "injection test",
          summary: "testing guard",
          [field]: "injected",
        },
      });
      expect(res.status()).toBe(422);
    });
  }
});

import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const contractAddress =
  process.env.E2E_CONTRACT_ADDRESS ??
  process.env.NEXT_PUBLIC_GUARDIAN_LAYER_CONTRACT_ADDRESS ??
  "0xf53A06740c8C4d8973036bdbD9b71d05A81856F0";
const runOnchain = process.env.E2E_ONCHAIN === "1";
const platformKey = process.env.GUARDIAN_LAYER_PLATFORM_WALLET_PRIVATE_KEY;

test.describe("Authenticated team-visible contract flow", () => {
  test.skip(!email || !password, "E2E_USER_EMAIL and E2E_USER_PASSWORD are required");

  test("team can see organisation, protocol, and monitored contract details", async ({ page }) => {
    test.setTimeout(runOnchain ? 12 * 60_000 : 90_000);

    const runId = Date.now().toString(36);
    const protocolName = `Guardian Contract E2E ${runId}`;
    const description = `Team-visible contract monitoring e2e run ${runId}`;
    const contractName = `GuardianLayerProtocol ${runId}`;
    const signalTitle = `On-chain adjudication signal ${runId}`;
    const incidentTitle = `GenLayer adjudication incident ${runId}`;

    await login(page);

    await test.step("dashboard shows the real organisation and wallet", async () => {
      await page.goto("/app/overview");
      await expect(page.getByRole("heading", { name: "Guardian Command" })).toBeVisible();
      await expect(page.getByText("Papito Labs")).toBeVisible();
      await expect(page.getByText("Embedded wallet")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Protocol Registry" })).toBeVisible();
    });

    await test.step("profile exposes user, wallet, and identity details", async () => {
      await gotoApp(page, "/app/profile");
      await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
      await expect(page.getByRole("main").getByText(email!)).toBeVisible();
      await expect(page.getByText("User ID")).toBeVisible();
      await expect(page.getByText("Embedded Wallet")).toBeVisible();
    });

    await test.step("settings exposes organisation security posture", async () => {
      await gotoApp(page, "/app/settings");
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
      await expect(page.getByText("Organisation")).toBeVisible();
      await expect(page.getByText("Security Posture")).toBeVisible();
      await expect(page.getByRole("main").getByText("Papito Labs", { exact: true })).toBeVisible();
      await expect(page.getByText("Owner Wallet")).toBeVisible();
    });

    await test.step("team page shows the logged-in owner", async () => {
      await gotoApp(page, "/app/team");
      await expect(page.getByRole("main").getByText("Papito Labs")).toBeVisible();
      await expect(page.getByRole("main").getByText(email!)).toBeVisible();
      expect(await page.getByRole("main").getByText("Owner").count()).toBeGreaterThan(0);
    });

    await test.step("register protocol with concrete details", async () => {
      await gotoApp(page, "/app/protocols/new");
      await expect(page.getByRole("heading", { name: "Register Protocol" })).toBeVisible();

      await page.locator('input[name="name"]').fill(protocolName);
      await page.locator('textarea[name="description"]').fill(description);
      await page.locator('select[name="category"]').selectOption("other");
      await page.locator('select[name="chain"]').selectOption("other");
      await page.locator('select[name="network"]').selectOption("testnet");
      await page.locator('input[name="website_url"]').fill("https://example.com/guardian-contract-e2e");
      await page.locator('input[name="github_url"]').fill("https://github.com/openai/openai-cookbook");

      await page.getByRole("button", { name: "Register Protocol" }).click();
      await page.waitForURL(/\/app\/protocols\/[0-9a-f-]+/, { timeout: 30_000 });

      await expect(page.getByRole("heading", { name: protocolName })).toBeVisible();
      await expect(page.getByText(description)).toBeVisible();
      await expect(page.getByText("other/testnet")).toBeVisible();
      await expect(page.getByText("Register on GenLayer")).toBeVisible();
    });

    const protocolUrl = page.url();

    await test.step("add monitored contract details team can inspect", async () => {
      await gotoAbsolute(page, `${protocolUrl}?tab=contracts`);
      await expect(page.getByText("Contracts (0)")).toBeVisible();

      await page.getByRole("button", { name: "Add Contract" }).click();
      await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 10_000 });
      await page.locator('input[name="name"]').fill(contractName);
      await page.locator('select[name="role"]').selectOption("core");
      await page.locator('input[name="address"]').fill(contractAddress);
      await page.locator('input[name="is_pause_capable"]').check();
      await page.locator('input[name="pause_function_name"]').fill("pause");
      await page.locator("form").getByRole("button", { name: "Add Contract" }).click();

      await page.waitForURL(/tab=contracts/, { timeout: 30_000 });
      const contractRow = page.getByRole("row").filter({ hasText: contractName });
      await expect(contractRow).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("Contracts (1)")).toBeVisible();
      await expect(contractRow.getByText("core", { exact: true })).toBeVisible();
      await expect(contractRow.getByText("Active", { exact: true })).toBeVisible();
      await expect(contractRow.getByText("pause", { exact: false })).toBeVisible();
      await expect(contractRow.getByText(contractAddress.slice(0, 8), { exact: false })).toBeVisible();
    });

    await test.step("registry and dashboard show the new protocol", async () => {
      await gotoApp(page, "/app/protocols");
      const protocolCard = page.getByRole("link").filter({ hasText: protocolName });
      await expect(protocolCard).toBeVisible();
      await expect(protocolCard.getByText("other/testnet", { exact: true })).toBeVisible();

      await gotoApp(page, "/app/overview");
      await expect(page.getByText(protocolName)).toBeVisible();
    });

    if (!runOnchain) return;

    await test.step("preflight on-chain signing configuration", async () => {
      expect(platformKey, "GUARDIAN_LAYER_PLATFORM_WALLET_PRIVATE_KEY must be set for E2E_ONCHAIN=1").toMatch(/^0x[0-9a-fA-F]+$/);
    });

    await test.step("register protocol on GenLayer contract", async () => {
      await gotoAbsolute(page, protocolUrl);
      await page.getByRole("button", { name: "Register on GenLayer" }).click();
      await expect(page.getByText(/Registered|View tx|Registered! View tx/)).toBeVisible({ timeout: 4 * 60_000 });
    });

    await test.step("submit signal and escalate to incident", async () => {
      await gotoApp(page, "/app/signals/new");
      await page.locator('select[name="protocol_id"]').selectOption({ label: `${protocolName} (other/testnet)` });
      await page.locator('select[name="signal_type"]').selectOption("contract_anomaly");
      await page.locator('select[name="severity_hint"]').selectOption("critical");
      await page.locator('input[name="title"]').fill(signalTitle);
      await page.locator('textarea[name="summary"]').fill(
        `Full e2e on-chain signal for ${contractName}. This verifies Guardian Layer evidence, incident creation, and GenLayer contract adjudication.`
      );
      await page.locator('textarea[name="tx_hashes"]').fill(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      );
      await page.locator('textarea[name="affected_contracts"]').fill(contractAddress);
      await page.locator('textarea[name="evidence_urls"]').fill("https://example.com/genlayer-e2e-evidence");
      await page.getByRole("button", { name: "Submit Signal" }).click();
      await page.waitForURL(/\/app\/signals\/[0-9a-f-]+/, { timeout: 30_000 });

      await expect(page.getByRole("heading", { name: signalTitle })).toBeVisible();
      await page.locator('input[name="title"]').fill(incidentTitle);
      await page.locator('textarea[name="summary"]').fill(
        `Escalated from ${signalTitle}; evidence hash should be submitted to the deployed GenLayer Guardian contract.`
      );
      await page.locator('select[name="threat_level"]').selectOption("critical");
      await page.getByRole("button", { name: "Escalate to Incident" }).click();
      await page.waitForURL(/\/app\/incidents\/[0-9a-f-]+/, { timeout: 30_000 });
      await expect(page.getByRole("heading", { name: incidentTitle })).toBeVisible();
      await expect(page.getByText("Evidence Packet")).toBeVisible();
      await expect(page.getByText("SHA-256 Hash")).toBeVisible();
    });

    await test.step("submit, adjudicate, and sync incident on GenLayer", async () => {
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(page.getByText("View tx")).toBeVisible({ timeout: 4 * 60_000 });

      await page.getByRole("button", { name: "Adjudicate" }).click();
      await expect(page.getByText("View adjudication tx")).toBeVisible({ timeout: 8 * 60_000 });

      await page.getByRole("button", { name: "Sync Decision" }).click();
      await page.waitForLoadState("domcontentloaded", { timeout: 60_000 });
      await expect(page.getByText("GenLayer Consensus Decision")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText("Source of truth:")).toBeVisible();
      await expect(page.getByText("genlayer")).toBeVisible();
    });
  });
});

async function login(page: Page) {
  await gotoApp(page, "/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\/overview/, { timeout: 30_000 });
}

async function gotoApp(page: Page, path: string) {
  await page.goto(path, { waitUntil: "load", timeout: 30_000 });
}

async function gotoAbsolute(page: Page, url: string) {
  await page.goto(url, { waitUntil: "load", timeout: 30_000 });
}

import { test, expect } from "@playwright/test";

test.describe("Authentication flow", () => {
  test("redirects unauthenticated users from /app to /login", async ({ page }) => {
    await page.goto("/app/overview");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1, h2")).toContainText(/sign in|log in|guardian/i);
    await expect(page.locator("input[type=email]")).toBeVisible();
    await expect(page.locator("input[type=password]")).toBeVisible();
  });

  test("signup page renders correctly", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("input[type=email]")).toBeVisible();
  });

  test("forgot password page renders correctly", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("input[type=email]")).toBeVisible();
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type=email]", "nonexistent@example.com");
    await page.fill("input[type=password]", "wrongpassword123");
    await page.click("button[type=submit]");
    // Expect error message to appear (various possible messages)
    await expect(page.locator("text=/invalid|incorrect|error|failed/i")).toBeVisible({ timeout: 8000 });
  });
});

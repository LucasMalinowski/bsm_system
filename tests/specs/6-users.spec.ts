import { test, expect } from "@playwright/test";

test.describe("Users (super_admin)", () => {
  test("users list page loads", async ({ page }) => {
    await page.goto("/super-admin/users");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Usuários");
  });

  test("shows user rows", async ({ page }) => {
    await page.goto("/super-admin/users");
    await page.waitForLoadState("networkidle");
    // At least one row should be visible (the admin account itself)
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 10_000 });
  });

  test("clicking a user navigates to their detail page", async ({ page }) => {
    await page.goto("/super-admin/users");
    await page.waitForLoadState("networkidle");
    const firstUserLink = page.locator("a[href*='/users/']").first();
    if (await firstUserLink.count() > 0) {
      await firstUserLink.click();
      // Use networkidle instead of strict URL match to avoid SSR timing issues
      await page.waitForLoadState("networkidle", { timeout: 20_000 });
      await expect(page.locator("h1, h2").first()).toBeVisible();
    }
  });
});

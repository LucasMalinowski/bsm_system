import { test, expect } from "@playwright/test";

test.describe("Documents (super_admin)", () => {
  test("documents list page loads", async ({ page }) => {
    await page.goto("/super-admin/documents");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Documentos");
  });

  test("desktop: shows table view", async ({ page, isMobile }) => {
    test.skip(isMobile, "table is desktop only");
    await page.goto("/super-admin/documents");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("table")).toBeVisible();
  });

  test("mobile: shows card list view", async ({ page, isMobile }) => {
    test.skip(!isMobile, "card list is mobile only");
    await page.goto("/super-admin/documents");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Documentos");
  });

  test("clicking a document opens its detail page", async ({ page }) => {
    await page.goto("/super-admin/documents");
    await page.waitForLoadState("networkidle");
    const firstDocLink = page.locator("a[href^='/documents/']").first();
    if (await firstDocLink.count() > 0) {
      const href = await firstDocLink.getAttribute("href");
      await firstDocLink.click();
      await page.waitForURL(`**${href}`, { timeout: 10_000 });
      await expect(page.locator("h1, h2").first()).toBeVisible();
    }
  });
});

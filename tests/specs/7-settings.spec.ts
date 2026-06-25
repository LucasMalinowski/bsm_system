import { test, expect } from "@playwright/test";

// Super_admin doesn't have a personal settings page — test the companies list instead,
// which is the SA's "home base" for company management
test.describe("Companies (super_admin settings hub)", () => {
  test("companies list page loads", async ({ page }) => {
    await page.goto("/super-admin/companies");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Empresas");
  });

  test("shows company rows", async ({ page }) => {
    await page.goto("/super-admin/companies");
    await page.waitForLoadState("networkidle");
    // Should have at least one company row
    await expect(
      page.locator("table tbody tr, .grid > *").first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

// Company-level admin settings (only accessible via impersonation or company admin login)
test.describe("Company settings (company admin only)", () => {
  test.skip(true, "Requires company admin context — super_admin has no /admin/settings");

  test("settings page loads", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText(/Configurações/i);
  });

  test("company name field is visible", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('input').first()).toBeVisible({ timeout: 10_000 });
  });

  test("save button is present", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.waitForLoadState("networkidle");
    await expect(
      page.locator('button:has-text("Salvar"), button:has-text("Save")').first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

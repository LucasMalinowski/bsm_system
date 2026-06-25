import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("loads and shows greeting", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Olá");
  });

  test("shows stat cards (super_admin view)", async ({ page }) => {
    // Super admin dashboard shows: Empresas, Total de Equipamentos, Chamados Abertos, Usuários Ativos
    await expect(page.locator("text=Total de Equipamentos").first()).toBeVisible();
  });

  test("shows recent equipment section", async ({ page }) => {
    await expect(page.locator("text=Equipamentos Recentes")).toBeVisible();
  });

  test("shows active tickets section", async ({ page }) => {
    await expect(page.locator("text=Chamados Ativos")).toBeVisible();
  });

  test("desktop: sidebar is visible with BSM logo", async ({ page, isMobile }) => {
    test.skip(isMobile, "sidebar is desktop-only");
    await expect(page.locator("aside")).toBeVisible();
    await expect(page.locator("aside span").filter({ hasText: "BSM" }).first()).toBeVisible();
  });

  test("mobile: bottom nav is visible", async ({ page, isMobile }) => {
    test.skip(!isMobile, "bottom nav is mobile-only");
    await expect(page.locator("nav.fixed")).toBeVisible();
    await expect(page.locator("nav.fixed a").filter({ hasText: "Início" })).toBeVisible();
  });
});

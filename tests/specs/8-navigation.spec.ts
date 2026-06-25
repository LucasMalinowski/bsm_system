import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test.describe("Desktop sidebar (super_admin)", () => {
    test.skip(({ isMobile }) => isMobile, "desktop only");

    test("sidebar links navigate correctly", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");
      const sidebar = page.locator("aside");

      // Empresas
      await sidebar.locator("a", { hasText: "Empresas" }).click();
      await page.waitForURL("**/super-admin/companies", { timeout: 8_000 });
      await expect(page.locator("h1")).toContainText("Empresas");

      // Equipamentos
      await sidebar.locator("a", { hasText: "Equipamentos" }).click();
      await page.waitForURL("**/super-admin/equipment", { timeout: 8_000 });
      await expect(page.locator("h1")).toContainText("Equipamentos");

      // Chamados
      await sidebar.locator("a", { hasText: "Chamados" }).click();
      await page.waitForURL("**/super-admin/tickets", { timeout: 8_000 });
      await expect(page.locator("h1")).toContainText("Chamados");

      // Documentos
      await sidebar.locator("a", { hasText: "Documentos" }).first().click();
      await page.waitForURL("**/super-admin/documents", { timeout: 8_000 });
      await expect(page.locator("h1")).toContainText("Documentos");

      // Usuários
      await sidebar.locator("a", { hasText: "Usuários" }).click();
      await page.waitForURL("**/super-admin/users", { timeout: 8_000 });
      await expect(page.locator("h1")).toContainText("Usuários");
    });
  });

  test.describe("Mobile bottom nav (super_admin)", () => {
    test.skip(({ isMobile }) => !isMobile, "mobile only");
    // Each nav hop can take ~5s on SSR; split into separate tests to stay under 30s each

    test("bottom nav: dashboard → empresas", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");
      await page.locator("nav.fixed a", { hasText: "Empresas" }).click();
      await page.waitForURL("**/super-admin/companies", { timeout: 15_000 });
      await expect(page.locator("h1")).toContainText("Empresas");
    });

    test("bottom nav: dashboard → equipamentos", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");
      await page.locator("nav.fixed a", { hasText: "Equip." }).click();
      await page.waitForURL("**/super-admin/equipment", { timeout: 15_000 });
      await expect(page.locator("h1")).toContainText("Equipamentos");
    });

    test("bottom nav: dashboard → chamados", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");
      await page.locator("nav.fixed a", { hasText: "Chamados" }).click();
      await page.waitForURL("**/super-admin/tickets", { timeout: 15_000 });
      await expect(page.locator("h1")).toContainText("Chamados");
    });
  });
});

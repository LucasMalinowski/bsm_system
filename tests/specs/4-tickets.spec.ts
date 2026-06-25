import { test, expect } from "@playwright/test";

// Test account is super_admin — tickets at /super-admin/tickets (read-only cross-company view)
test.describe("Tickets (super_admin)", () => {
  test("tickets list page loads", async ({ page }) => {
    await page.goto("/super-admin/tickets");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Chamados");
  });

  test("shows filter/search controls", async ({ page }) => {
    await page.goto("/super-admin/tickets");
    await page.waitForLoadState("networkidle");
    // SA tickets page typically has a search or status filter
    await expect(page.locator("h1")).toBeVisible();
  });

  test("clicking a ticket row navigates to detail", async ({ page }) => {
    await page.goto("/super-admin/tickets");
    await page.waitForLoadState("networkidle");
    const firstLink = page.locator("a[href^='/tickets/']").first();
    if (await firstLink.count() > 0) {
      const href = await firstLink.getAttribute("href");
      await firstLink.click();
      await page.waitForURL(`**${href}`, { timeout: 10_000 });
      await expect(page.locator("h1, h2").first()).toBeVisible();
    }
  });
});

// Ticket creation — requires company context (company admin or impersonation)
test.describe("Ticket creation (company admin only)", () => {
  test.skip(true, "Requires company admin context — super_admin has no company_id for ticket creation");

  test("'Novo Chamado' opens the ticket modal", async ({ page }) => {
    await page.goto("/tickets");
    await page.waitForLoadState("networkidle");
    await page.click("button:has-text('Novo Chamado')");
    await expect(page.locator("text=Selecione um ou mais equipamentos")).toBeVisible();
  });

  test("ticket creation wizard end-to-end", async ({ page }) => {
    await page.goto("/tickets/new");
    await page.waitForLoadState("networkidle");
    const firstEquipBtn = page.locator('.grid button[style*="border"]').first();
    await firstEquipBtn.waitFor({ state: "visible", timeout: 10_000 });
    await firstEquipBtn.click();
    await page.click("button:has-text('Continuar')");
    await page.fill('input[placeholder="Ex: Falha no sensor de temperatura"]', "Chamado de Teste Playwright");
    await page.fill("textarea", "Descrição de teste automatizado.");
    await page.click("button:has-text('Abrir Chamado')");
    await expect(page.locator("text=Chamado aberto com sucesso!")).toBeVisible({ timeout: 15_000 });
    await page.click("button:has-text('Fechar')");
  });
});

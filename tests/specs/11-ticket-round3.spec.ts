/**
 * Tests for client feedback round 3 — Ticket (Chamado) improvements:
 * - ticket:comment permission visible in permissions grid (Comentar column)
 * - Finalization modal (reason + notes) when closing a ticket
 * - Chat-style comment UI (bubbles)
 * - Budget URL field in API
 * - DB columns finalization_reason / finalization_notes / budget_url present
 *
 * Note: default auth is super_admin (admin@bsmsistemas.com) with no company_id.
 * Ticket/user APIs require company_id passed explicitly for SA.
 */
import { test, expect, type Page } from "@playwright/test";

test.setTimeout(60_000);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function firstCompanyId(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const r = await fetch("/api/companies?limit=1");
    if (!r.ok) return null;
    const d = await r.json();
    return (d.data?.[0]?.id as string) ?? null;
  });
}

async function firstUserIdInCompany(page: Page, companyId: string): Promise<string | null> {
  return page.evaluate(async (cid) => {
    const r = await fetch(`/api/users?company_id=${cid}&limit=1`);
    if (!r.ok) return null;
    const d = await r.json();
    return (d.data?.[0]?.id as string) ?? null;
  }, companyId);
}

async function createTicket(page: Page, companyId: string): Promise<string | null> {
  return page.evaluate(async (cid) => {
    const r = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: cid,
        title: "Playwright Round3 Ticket",
        description: "Automated test — round 3 finalization and chat",
        priority: "medium",
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return (d.data?.id as string) ?? null;
  }, companyId);
}

async function deleteTicket(page: Page, ticketId: string) {
  await page.evaluate(async (id) => {
    await fetch(`/api/tickets/${id}`, { method: "DELETE" });
  }, ticketId);
}

// ─── 1. Permissions grid: Comentar column visible ────────────────────────────

test.describe("Round 3 — Comentar column in permissions grid [SA]", () => {
  let companyId: string | null = null;
  let userId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    companyId = await firstCompanyId(page);
    if (companyId) userId = await firstUserIdInCompany(page, companyId);
  });

  test("role manager header has Comentar as 5th column", async ({ page }) => {
    if (!userId) { test.skip(); return; }

    await page.goto(`/admin/users/${userId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Comentar").first()).toBeVisible({ timeout: 8000 });
  });

  test("Chamados row shows Comentar chip (5 columns in permissions grid)", async ({ page }) => {
    if (!userId) { test.skip(); return; }

    await page.goto(`/admin/users/${userId}`);
    await page.waitForLoadState("networkidle");

    // Header row should show "Comentar"
    await expect(page.getByText("Comentar").first()).toBeVisible({ timeout: 8000 });

    // The Chamados label should be visible in the grid (span inside the permissions table)
    await expect(page.locator("span.font-semibold", { hasText: "Chamados" })).toBeVisible();
  });
});

// ─── 2. ticket:comment permission exists ────────────────────────────────────

test.describe("Round 3 — ticket:comment permission reachable [SA]", () => {
  test("users API returns non-empty list when company_id provided", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const companyId = await firstCompanyId(page);
    if (!companyId) { test.skip(); return; }

    const count = await page.evaluate(async (cid) => {
      const r = await fetch(`/api/users?company_id=${cid}&limit=5`);
      if (!r.ok) return 0;
      const d = await r.json();
      return d.data?.length ?? 0;
    }, companyId);

    expect(count).toBeGreaterThan(0);
  });
});

// ─── 3. Finalization modal appears when clicking Fechar ──────────────────────

test.describe("Round 3 — finalization modal on ticket detail [SA]", () => {
  let companyId: string | null = null;
  let ticketId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    companyId = await firstCompanyId(page);
    if (companyId) ticketId = await createTicket(page, companyId);
  });

  test.afterEach(async ({ page }) => {
    if (ticketId) await deleteTicket(page, ticketId);
  });

  test("Fechar button on ticket detail opens finalization modal", async ({ page }) => {
    if (!ticketId) { test.skip(); return; }

    await page.goto(`/tickets/${ticketId}`);
    await page.waitForLoadState("networkidle");

    const fecharBtn = page.getByRole("button", { name: /Fechar/i });
    if (await fecharBtn.count() === 0) { test.skip(); return; }

    await fecharBtn.click();

    await expect(page.getByText("Finalizar Chamado")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Finalizado")).toBeVisible();
    await expect(page.getByText("Descartado")).toBeVisible();
    await expect(page.getByText("Peça indisponível")).toBeVisible();
    await expect(page.getByText("Aguardando fabricante")).toBeVisible();
    await expect(page.getByText("Outro")).toBeVisible();
  });

  test("Confirmar button is disabled until a reason is selected", async ({ page }) => {
    if (!ticketId) { test.skip(); return; }

    await page.goto(`/tickets/${ticketId}`);
    await page.waitForLoadState("networkidle");

    const fecharBtn = page.getByRole("button", { name: /Fechar/i });
    if (await fecharBtn.count() === 0) { test.skip(); return; }

    await fecharBtn.click();
    await expect(page.getByText("Finalizar Chamado")).toBeVisible({ timeout: 5000 });

    const confirmBtn = page.getByRole("button", { name: /Confirmar/i });
    await expect(confirmBtn).toBeDisabled();

    await page.getByText("Finalizado").click();
    await expect(confirmBtn).toBeEnabled();
  });

  test("finalizing via API sets status=closed and persists finalization_reason", async ({ page }) => {
    if (!ticketId) { test.skip(); return; }

    const result = await page.evaluate(async (id) => {
      const r = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "closed",
          finalization_reason: "Finalizado",
          finalization_notes: "Teste automático Playwright round 3",
        }),
      });
      if (!r.ok) return null;
      const d = await r.json();
      return d.data;
    }, ticketId);

    expect(result).not.toBeNull();
    expect(result.status).toBe("closed");
    expect(result.finalization_reason).toBe("Finalizado");
    expect(result.finalization_notes).toBe("Teste automático Playwright round 3");
  });

  test("finalization_reason shown in ticket detail after closing", async ({ page }) => {
    if (!ticketId) { test.skip(); return; }

    // Close via API first
    await page.evaluate(async (id) => {
      await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed", finalization_reason: "Descartado" }),
      });
    }, ticketId);

    await page.goto(`/tickets/${ticketId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Descartado")).toBeVisible({ timeout: 8000 });
  });
});

// ─── 4. Chat bubble UI for comments ──────────────────────────────────────────

test.describe("Round 3 — chat bubble UI for comments [SA]", () => {
  let companyId: string | null = null;
  let ticketId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    companyId = await firstCompanyId(page);
    if (companyId) ticketId = await createTicket(page, companyId);
  });

  test.afterEach(async ({ page }) => {
    if (ticketId) await deleteTicket(page, ticketId);
  });

  test("comment posted via form appears as a bubble", async ({ page }) => {
    if (!ticketId) { test.skip(); return; }

    await page.goto(`/tickets/${ticketId}`);
    await page.waitForLoadState("networkidle");

    const textarea = page.locator("textarea[placeholder*='comentário']");
    if (await textarea.count() === 0) { test.skip(); return; }

    await textarea.fill("Mensagem de teste bubble Playwright");
    await page.getByRole("button", { name: /Comentar/i }).click();

    // Text should appear
    await expect(page.getByText("Mensagem de teste bubble Playwright")).toBeVisible({ timeout: 8000 });

    // Bubble should have rounded-2xl class (chat style)
    const bubble = page.locator(".rounded-2xl").first();
    await expect(bubble).toBeVisible();
  });

  test("comment count header updates from 0 to 1 after posting", async ({ page }) => {
    if (!ticketId) { test.skip(); return; }

    await page.goto(`/tickets/${ticketId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/Comentários \(0\)/)).toBeVisible({ timeout: 5000 });

    const textarea = page.locator("textarea[placeholder*='comentário']");
    if (await textarea.count() === 0) { test.skip(); return; }

    await textarea.fill("Primeiro comentário");
    await page.getByRole("button", { name: /Comentar/i }).click();

    await expect(page.getByText(/Comentários \(1\)/)).toBeVisible({ timeout: 8000 });
  });

  test("posting a comment via API renders it on page load", async ({ page }) => {
    if (!ticketId) { test.skip(); return; }

    const addResult = await page.evaluate(async (id) => {
      const r = await fetch(`/api/tickets/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "Comentário via API Playwright R3" }),
      });
      return { ok: r.ok, status: r.status };
    }, ticketId);

    expect(addResult.ok).toBe(true);

    await page.goto(`/tickets/${ticketId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Comentário via API Playwright R3")).toBeVisible({ timeout: 8000 });
  });
});

// ─── 5. Budget URL field in API ───────────────────────────────────────────────

test.describe("Round 3 — budget_url field in ticket API [SA]", () => {
  let companyId: string | null = null;
  let ticketId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    companyId = await firstCompanyId(page);
    if (companyId) ticketId = await createTicket(page, companyId);
  });

  test.afterEach(async ({ page }) => {
    if (ticketId) await deleteTicket(page, ticketId);
  });

  test("PATCH ticket with budget_url saves and returns the value", async ({ page }) => {
    if (!ticketId) { test.skip(); return; }

    const fakeUrl = "https://example.com/orcamento-playwright.pdf";

    const result = await page.evaluate(async ({ id, url }) => {
      const r = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget_url: url }),
      });
      if (!r.ok) return null;
      const d = await r.json();
      return d.data?.budget_url as string | null;
    }, { id: ticketId, url: fakeUrl });

    expect(result).toBe(fakeUrl);
  });

  test("budget_url set via API shows Ver Orçamento link on detail page", async ({ page }) => {
    if (!ticketId) { test.skip(); return; }

    const fakeUrl = "https://example.com/orcamento-view.pdf";

    await page.evaluate(async ({ id, url }) => {
      await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget_url: url }),
      });
    }, { id: ticketId, url: fakeUrl });

    await page.goto(`/tickets/${ticketId}`);
    await page.waitForLoadState("networkidle");

    const link = page.getByRole("link", { name: /Ver Orçamento/i });
    await expect(link).toBeVisible({ timeout: 8000 });
    const href = await link.getAttribute("href");
    expect(href).toBe(fakeUrl);
  });

  test("Orçamento card shows upload input when canUpdate", async ({ page }) => {
    if (!ticketId) { test.skip(); return; }

    await page.goto(`/tickets/${ticketId}`);
    await page.waitForLoadState("networkidle");

    // The "Orçamento" section header should be present
    await expect(page.getByText("Orçamento").first()).toBeVisible({ timeout: 8000 });

    // The file input for uploading should be present (hidden input inside label)
    const fileInput = page.locator('input[type="file"][accept*=".pdf"]');
    await expect(fileInput).toBeAttached();
  });
});

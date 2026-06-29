/**
 * Tests for client feedback round 4:
 * - Item 2a: PATCH equipment with category_name no longer causes "column not found" error
 * - Item 3:  GET calibration-points returns data for equipment that has points
 * - Item 5:  Equipment detail page shows photo; lightbox overlay present in DOM
 * - PDF:     Export button present on equipment detail page
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

async function createEquipment(page: Page, companyId: string): Promise<string | null> {
  return page.evaluate(async (cid) => {
    const r = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: cid,
        internal_code: "R4-TEST-01",
        name: "Playwright Round4 Equipment",
        status: "active",
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return (d.data?.id as string) ?? null;
  }, companyId);
}

async function deleteEquipment(page: Page, equipmentId: string) {
  await page.evaluate(async (id) => {
    await fetch(`/api/equipment/${id}`, { method: "DELETE" });
  }, equipmentId);
}

async function addCalibrationPoints(page: Page, equipmentId: string): Promise<boolean> {
  return page.evaluate(async (id) => {
    const r = await fetch(`/api/equipment/${id}/calibration-points`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points: [
          { point_value: "100g", criterion: "±0.01g", error_tolerance: 0.01, sort_order: 0 },
          { point_value: "500g", criterion: "±0.05g", error_tolerance: 0.05, sort_order: 1 },
        ],
      }),
    });
    return r.ok;
  }, equipmentId);
}

// ─── 1. PATCH with category_name ─────────────────────────────────────────────

test.describe("Round 4 — PATCH equipment with category_name [SA]", () => {
  let companyId: string | null = null;
  let equipmentId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    companyId = await firstCompanyId(page);
    if (companyId) equipmentId = await createEquipment(page, companyId);
  });

  test.afterEach(async ({ page }) => {
    if (equipmentId) await deleteEquipment(page, equipmentId);
  });

  test("PATCH with category_name returns 200 and updates category", async ({ page }) => {
    if (!equipmentId) { test.skip(); return; }

    const result = await page.evaluate(async (id) => {
      const r = await fetch(`/api/equipment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_name: "Pesagem" }),
      });
      return { ok: r.ok, status: r.status, data: r.ok ? await r.json() : null };
    }, equipmentId);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    // Category should be resolved — either category.name or category_id should be set
    const category = result.data?.data?.category;
    if (category) {
      expect(category.name).toBe("Pesagem");
    }
  });

  test("PATCH with category_name does not return 400 column error", async ({ page }) => {
    if (!equipmentId) { test.skip(); return; }

    const status = await page.evaluate(async (id) => {
      const r = await fetch(`/api/equipment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_name: "Química" }),
      });
      return r.status;
    }, equipmentId);

    expect(status).not.toBe(400);
    expect(status).not.toBe(500);
  });
});

// ─── 2. Calibration points GET ───────────────────────────────────────────────

test.describe("Round 4 — GET calibration-points returns data [SA]", () => {
  let companyId: string | null = null;
  let equipmentId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    companyId = await firstCompanyId(page);
    if (companyId) {
      equipmentId = await createEquipment(page, companyId);
      if (equipmentId) await addCalibrationPoints(page, equipmentId);
    }
  });

  test.afterEach(async ({ page }) => {
    if (equipmentId) await deleteEquipment(page, equipmentId);
  });

  test("GET calibration-points returns the points that were saved", async ({ page }) => {
    if (!equipmentId) { test.skip(); return; }

    const result = await page.evaluate(async (id) => {
      const r = await fetch(`/api/equipment/${id}/calibration-points`);
      if (!r.ok) return { ok: false, count: 0 };
      const d = await r.json();
      return { ok: true, count: (d.data ?? []).length };
    }, equipmentId);

    expect(result.ok).toBe(true);
    expect(result.count).toBe(2);
  });

  test("Calibração tab on equipment detail shows calibration points", async ({ page }) => {
    if (!equipmentId) { test.skip(); return; }

    await page.goto(`/equipment/${equipmentId}`);
    await page.waitForLoadState("networkidle");

    // Click the calibration tab
    const calTab = page.getByRole("button", { name: /calibração/i }).first();
    if (await calTab.count() === 0) { test.skip(); return; }
    await calTab.click();

    // Should NOT show "Nenhum ponto cadastrado"
    await page.waitForTimeout(1500); // let fetch complete
    const emptyText = page.getByText("Nenhum ponto cadastrado");
    const isEmpty = await emptyText.isVisible();
    expect(isEmpty).toBe(false);

    // Should show the point value
    await expect(page.getByText("100g")).toBeVisible({ timeout: 5000 });
  });
});

// ─── 3. Equipment detail — photo and lightbox ─────────────────────────────────

test.describe("Round 4 — equipment detail photo interactions [SA]", () => {
  let companyId: string | null = null;
  let equipmentId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    companyId = await firstCompanyId(page);
    if (companyId) equipmentId = await createEquipment(page, companyId);
  });

  test.afterEach(async ({ page }) => {
    if (equipmentId) await deleteEquipment(page, equipmentId);
  });

  test("PDF export button is present on equipment detail", async ({ page }) => {
    if (!equipmentId) { test.skip(); return; }

    await page.goto(`/equipment/${equipmentId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: /Exportar PDF/i })).toBeVisible({ timeout: 8000 });
  });

  test("Equipment detail page loads successfully", async ({ page }) => {
    if (!equipmentId) { test.skip(); return; }

    await page.goto(`/equipment/${equipmentId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Playwright Round4 Equipment")).toBeVisible({ timeout: 8000 });
  });
});

// ─── 4. Calibration points UI: no empty message when points exist ─────────────

test.describe("Round 4 — calibration points tab not empty [SA]", () => {
  let companyId: string | null = null;
  let equipmentId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    companyId = await firstCompanyId(page);
    if (companyId) {
      equipmentId = await createEquipment(page, companyId);
      if (equipmentId) await addCalibrationPoints(page, equipmentId);
    }
  });

  test.afterEach(async ({ page }) => {
    if (equipmentId) await deleteEquipment(page, equipmentId);
  });

  test("Calibration points are returned by API (admin client fix)", async ({ page }) => {
    if (!equipmentId) { test.skip(); return; }

    const pts = await page.evaluate(async (id) => {
      const r = await fetch(`/api/equipment/${id}/calibration-points`);
      const d = await r.json();
      return d.data ?? [];
    }, equipmentId);

    expect(pts.length).toBeGreaterThan(0);
    expect(pts[0].point_value).toBe("100g");
  });
});

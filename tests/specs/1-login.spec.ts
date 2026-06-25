import { test, expect } from "@playwright/test";

// Login tests run WITHOUT the saved auth state — they test the login flow itself.
// Strip the storageState that the project injects by resetting the storage.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders login form", async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Entrar");
  });

  test("shows validation error for empty submit", async ({ page }) => {
    await page.click('button[type="submit"]');
    // Zod/react-hook-form validation fires client-side
    await expect(page.locator("p.text-red-400").first()).toBeVisible({ timeout: 5_000 });
  });

  test("shows error for wrong credentials", async ({ page }) => {
    await page.fill('input[type="email"]', "wrong@example.com");
    await page.fill('input[type="password"]', "wrongpass");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=E-mail ou senha incorretos")).toBeVisible({ timeout: 10_000 });
  });

  test("logs in successfully and lands on dashboard", async ({ page }) => {
    await page.fill('input[type="email"]', "admin@bsmsistemas.com");
    await page.fill('input[type="password"]', "AdminBsm!1");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(page.locator("h1")).toContainText("Olá");
  });

  test("password visibility toggle works", async ({ page }) => {
    const input = page.locator('input[name="password"]');
    await input.fill("testpassword");
    await expect(input).toHaveAttribute("type", "password");
    // Toggle show password
    await page.locator('button[tabindex="-1"]').click();
    await expect(input).toHaveAttribute("type", "text");
    // Toggle back
    await page.locator('button[tabindex="-1"]').click();
    await expect(input).toHaveAttribute("type", "password");
  });

  test("Esqueceu sua senha link is visible", async ({ page }) => {
    await expect(page.locator("a", { hasText: "Esqueceu sua senha?" })).toBeVisible();
  });
});

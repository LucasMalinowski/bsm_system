import { test as setup, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(".playwright", "auth-state.json");

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);

  await page.fill('input[type="email"]', "admin@bsmsistemas.com");
  await page.fill('input[type="password"]', "AdminBsm!1");
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard after successful login
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page.locator("h1")).toContainText("Olá");

  // Save auth cookies/storage for reuse in all tests
  await page.context().storageState({ path: AUTH_FILE });
});

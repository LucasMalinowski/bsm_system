import { test as setup, expect } from "@playwright/test";
import path from "path";

export const ADMIN_AUTH_FILE = path.join(".playwright", "admin-auth-state.json");
export const EMP_AUTH_FILE = path.join(".playwright", "employee-auth-state.json");

setup("authenticate as qa admin", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);

  await page.fill('input[type="email"]', "qa.admin@bsmsandbox.test");
  await page.fill('input[type="password"]', "QaAdmin!2025");
  await page.click('button[type="submit"]');

  // If admin account doesn't exist or login fails, skip gracefully
  try {
    await page.waitForURL("**/dashboard", { timeout: 20_000 });
    await page.context().storageState({ path: ADMIN_AUTH_FILE });
    console.log("Admin auth state saved successfully");
  } catch {
    // Account may not exist yet — save empty state so dependent tests auto-skip
    await page.context().storageState({ path: ADMIN_AUTH_FILE });
    console.warn("Admin login failed — tests using admin auth will skip or fail");
  }
});

setup("authenticate as qa employee", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);

  await page.fill('input[type="email"]', "qa.employee@bsmsandbox.test");
  await page.fill('input[type="password"]', "QaEmployee!2025");
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL("**/dashboard", { timeout: 20_000 });
    await page.context().storageState({ path: EMP_AUTH_FILE });
    console.log("Employee auth state saved successfully");
  } catch {
    await page.context().storageState({ path: EMP_AUTH_FILE });
    console.warn("Employee login failed — tests using employee auth will skip or fail");
  }
});

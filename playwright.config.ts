import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "pt-BR",
  },

  projects: [
    // Auth setup runs first, shared across all projects
    {
      name: "setup",
      testMatch: "**/global.setup.ts",
    },

    // Desktop Chrome
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".playwright/auth-state.json",
      },
      dependencies: ["setup"],
    },

    // Mobile — iPhone 12 viewport on Chromium (WebKit not required)
    {
      name: "mobile",
      use: {
        ...devices["iPhone 12"],
        browserName: "chromium",
        storageState: ".playwright/auth-state.json",
      },
      dependencies: ["setup"],
    },
  ],
});

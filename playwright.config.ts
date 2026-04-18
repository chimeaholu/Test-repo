import { defineConfig, devices } from "@playwright/test";

const artifactDir =
  process.env.PLAYWRIGHT_ARTIFACT_DIR || "execution/reviews/staging-e2e-evidence";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: `${artifactDir}/html-report`, open: "never" }]],
  outputDir: `${artifactDir}/test-results`,
  use: {
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL ||
      process.env.STAGING_BASE_URL ||
      "http://127.0.0.1:8000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "desktop-critical",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 960 },
      },
    },
    {
      name: "mobile-critical",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
});

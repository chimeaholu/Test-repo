import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const artifactDir =
  process.env.PLAYWRIGHT_ARTIFACT_DIR ??
  path.join("execution", "reviews", "playwright-screenshot-pack");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 900_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: path.join(artifactDir, "results.json") }],
    ["html", { outputFolder: path.join(artifactDir, "html-report"), open: "never" }],
  ],
  outputDir: path.join(artifactDir, "test-results"),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3011",
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    launchOptions: {
      args: ["--disable-dev-shm-usage"],
    },
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

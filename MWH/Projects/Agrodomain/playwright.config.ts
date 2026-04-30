import path from "node:path";
import os from "node:os";

import { defineConfig, devices } from "@playwright/test";

const artifactDir =
  process.env.PLAYWRIGHT_ARTIFACT_DIR ??
  path.join("execution", "reviews", "playwright-v001-n1");

const outputDir = path.join(artifactDir, "test-results");
const jsonReportFile = path.join(artifactDir, "results.json");
const htmlReportDir = path.join(artifactDir, "html-report");
const e2eDatabasePath =
  process.env.AGRO_E2E_DATABASE_PATH ?? path.join(artifactDir, "agrodomain-e2e.db");
const apiPort = Number(process.env.AGRO_E2E_API_PORT ?? "8000");
const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? "3000");
const webDistDir =
  process.env.PLAYWRIGHT_WEB_DIST_DIR ??
  path.join(os.tmpdir(), "agrodomain-next-playwright", "e2e");
const apiBaseUrl =
  process.env.AGRO_E2E_API_BASE_URL ?? `http://127.0.0.1:${apiPort}`;
const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${webPort}`;
const hasCustomServerEndpoints = Boolean(
  process.env.AGRO_E2E_API_BASE_URL ||
    process.env.AGRO_E2E_API_PORT ||
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.PLAYWRIGHT_WEB_PORT,
);
const forceFreshServers = process.env.AGRO_E2E_REAL_TRANSPORT_FIXTURES === "1";
const webServerCommand = `corepack pnpm exec next dev --hostname 127.0.0.1 --port ${webPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  workers: 1,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["json", { outputFile: jsonReportFile }],
    ["html", { outputFolder: htmlReportDir, open: "never" }],
  ],
  outputDir,
  use: {
    baseURL: baseUrl,
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
  webServer: [
    {
      command: `./.venv/bin/python ../../scripts/run_e2e_api.py`,
      cwd: "apps/api",
      url: `${apiBaseUrl}/readyz`,
      reuseExistingServer: !process.env.CI && !hasCustomServerEndpoints && !forceFreshServers,
      timeout: 300_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        AGRO_API_DATABASE_URL: `sqlite:///${e2eDatabasePath}`,
        AGRO_E2E_DATABASE_PATH: e2eDatabasePath,
        AGRO_E2E_API_HOST: "127.0.0.1",
        AGRO_E2E_API_PORT: String(apiPort),
      },
    },
    {
      command: webServerCommand,
      cwd: "apps/web",
      url: `${baseUrl}/`,
      reuseExistingServer: !process.env.CI && !hasCustomServerEndpoints && !forceFreshServers,
      timeout: 300_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        NEXT_PUBLIC_AGRO_API_BASE_URL: apiBaseUrl,
        NEXT_DIST_DIR: webDistDir,
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
});

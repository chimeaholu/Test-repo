import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const artifactDir = path.resolve(__dirname);
const repoRoot = "/tmp/agrodomain-buyer-remediate/MWH/Projects/Agrodomain";
const baseUrl = "http://127.0.0.1:39120";

export default defineConfig({
  testDir: path.join(repoRoot, "tests", "e2e"),
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: [
    ["list"],
    ["json", { outputFile: path.join(artifactDir, "results.json") }],
    ["html", { outputFolder: path.join(artifactDir, "html-report"), open: "never" }],
  ],
  outputDir: path.join(artifactDir, "test-results"),
  use: {
    baseURL: baseUrl,
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
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
  workers: 1,
});

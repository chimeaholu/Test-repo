import fs from "node:fs";
import path from "node:path";

const artifactDir = process.argv[2] ? path.resolve(process.argv[2]) : process.env.PLAYWRIGHT_ARTIFACT_DIR ? path.resolve(process.env.PLAYWRIGHT_ARTIFACT_DIR) : null;

if (!artifactDir) {
  throw new Error("Pass an artifact directory or set PLAYWRIGHT_ARTIFACT_DIR.");
}

const requiredShots = [
  "desktop-critical-01-home.png",
  "desktop-critical-02-signin.png",
  "desktop-critical-03-consent.png",
  "desktop-critical-04-role-home.png",
  "mobile-critical-01-home.png",
  "mobile-critical-02-signin.png",
  "mobile-critical-03-consent.png",
  "mobile-critical-04-role-home.png",
];

const screenshotDir = path.join(artifactDir, "screenshots");
const missing = requiredShots.filter((file) => !fs.existsSync(path.join(screenshotDir, file)));
if (missing.length > 0) {
  console.error("Missing required acceptance screenshots:");
  for (const file of missing) {
    console.error(`- screenshots/${file}`);
  }
  process.exit(1);
}

const resultsPath = path.join(artifactDir, "results.json");
if (!fs.existsSync(resultsPath)) {
  throw new Error(`results.json missing in ${artifactDir}`);
}

const payload = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const items = Array.isArray(payload.items) ? payload.items : [];
const requiredRoutes = ["/", "/signin", "/onboarding/consent", "/app/farmer"];

for (const route of requiredRoutes) {
  const hasDesktop = items.some((item) => item.route === route && item.project === "desktop-critical");
  const hasMobile = items.some((item) => item.route === route && item.project === "mobile-critical");
  if (!hasDesktop || !hasMobile) {
    console.error(`Acceptance proof incomplete for route ${route}.`);
    process.exit(1);
  }
}

console.log("Release proof guard passed.");

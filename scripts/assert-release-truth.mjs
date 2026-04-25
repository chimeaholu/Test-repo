import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

const prohibitedPatterns = [
  {
    file: "apps/web/app/app/admin/analytics/page.tsx",
    pattern: "PlaceholderPage",
    message: "Admin analytics still imports PlaceholderPage.",
  },
  {
    file: "apps/web/app/app/finance/queue/page.tsx",
    pattern: "PlaceholderPage",
    message: "Finance queue still imports PlaceholderPage.",
  },
  {
    file: "apps/web/app/app/cooperative/dispatch/page.tsx",
    pattern: "PlaceholderPage",
    message: "Cooperative dispatch still imports PlaceholderPage.",
  },
  {
    file: "apps/web/app/app/notifications/page.tsx",
    pattern: "lib/fixtures",
    message: "Notifications page still depends on fixture data.",
  },
  {
    file: "apps/web/app/app/traceability/[consignmentId]/page.tsx",
    pattern: "traceSteps",
    message: "Traceability route still uses the static traceSteps placeholder.",
  },
];

const requiredPatterns = [
  {
    file: "railway.json",
    pattern: "\"dockerfilePath\": \"apps/api/Dockerfile\"",
    message: "API Railway config is not pinned to the API dockerfile.",
  },
  {
    file: "apps/web/next.config.ts",
    pattern: "output: \"standalone\"",
    message: "Next web build is not configured for standalone deployment.",
  },
  {
    file: "apps/api/app/api/routes/preview.py",
    pattern: "Limited preview",
    message: "API limited-preview hotfix route is missing.",
  },
];

const failures = [];

for (const rule of prohibitedPatterns) {
  const absolutePath = path.join(projectRoot, rule.file);
  const content = fs.readFileSync(absolutePath, "utf8");
  if (content.includes(rule.pattern)) {
    failures.push(rule.message);
  }
}

for (const rule of requiredPatterns) {
  const absolutePath = path.join(projectRoot, rule.file);
  const content = fs.readFileSync(absolutePath, "utf8");
  if (!content.includes(rule.pattern)) {
    failures.push(rule.message);
  }
}

if (failures.length > 0) {
  console.error("Release truth assertions failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Release truth assertions passed.");

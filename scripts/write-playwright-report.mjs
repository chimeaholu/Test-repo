import fs from "node:fs";
import path from "node:path";

const artifactDir =
  process.env.PLAYWRIGHT_ARTIFACT_DIR ??
  path.join("execution", "reviews", "playwright-v001-n1");
const resultsPath = path.join(artifactDir, "results.json");
const reportPath = path.join(artifactDir, "PASS-FAIL-REPORT.md");
const htmlReportPath = path.join(artifactDir, "html-report", "index.html");

if (!fs.existsSync(resultsPath)) {
  console.error(`Playwright JSON report missing: ${resultsPath}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const rows = [];

function collectSpecs(suite, lineage = []) {
  const nextLineage = suite.title ? [...lineage, suite.title] : lineage;
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const result = test.results?.findLast?.(
        (candidate) => candidate.status && candidate.status !== "skipped",
      ) ?? test.results?.[0];
      rows.push({
        title: [...nextLineage, spec.title].filter(Boolean).join(" > "),
        project: test.projectName ?? "unknown",
        status: result?.status ?? "unknown",
        durationMs: result?.duration ?? 0,
        error: result?.error?.message ?? "",
      });
    }
  }
  for (const child of suite.suites ?? []) {
    collectSpecs(child, nextLineage);
  }
}

collectSpecs(report);

const summary = rows.reduce(
  (acc, row) => {
    acc.total += 1;
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  },
  { total: 0, passed: 0, failed: 0, skipped: 0, timedOut: 0, interrupted: 0 },
);

const lines = [
  "# Playwright Pass/Fail Report",
  "",
  "## Scope",
  "",
  "- Canonical Playwright browser coverage for implemented V-001 + N1 flows on `master`.",
  "- Covered: sign-in, consent grant, protected-route blocking, listing create/read/edit, buyer discovery shell, actor-scoped read denial, consent revoke/restore, and offline retry/dismiss/connectivity controls.",
  "- Failure/recovery coverage exercises invalid sign-in validation, route gating before consent, direct-detail denial for unauthorized actor access, and offline outbox recovery once connectivity returns.",
  "",
  "## Summary",
  "",
  `- Total tests: ${summary.total}`,
  `- Passed: ${summary.passed}`,
  `- Failed: ${summary.failed}`,
  `- Skipped: ${summary.skipped}`,
  "",
  "## Results",
  "",
];

for (const row of rows) {
  const durationSeconds = (row.durationMs / 1000).toFixed(2);
  lines.push(
    `- [${row.status.toUpperCase()}] [${row.project}] ${row.title} (${durationSeconds}s)${
      row.error ? ` - ${row.error}` : ""
    }`,
  );
}

lines.push(
  "",
  "## Artifacts",
  "",
  `- JSON results: \`${resultsPath}\``,
  `- HTML report: \`${htmlReportPath}\``,
  `- Raw test output: \`${path.join(artifactDir, "test-results")}\``,
  "",
);

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(reportPath, `${lines.join("\n")}\n`);
console.log(reportPath);

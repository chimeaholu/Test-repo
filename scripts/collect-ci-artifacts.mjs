import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = [
  "execution/reviews",
  "execution/heartbeats",
  "legacy/staging-runtime/tests/e2e",
];

function walk(pathname, output) {
  let entries = [];
  try {
    entries = readdirSync(pathname);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(pathname, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, output);
      continue;
    }
    output.push(fullPath);
  }
}

const artifacts = [];
for (const root of roots) {
  walk(root, artifacts);
}

console.log(JSON.stringify({ collected_at: new Date().toISOString(), artifacts }, null, 2));

import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(process.cwd());
const sourceRoots = [
  path.join(rootDir, "app"),
  path.join(rootDir, "components"),
  path.join(rootDir, "features"),
  path.join(rootDir, "lib"),
];

const blockedPatterns = [
  { label: "Wave label", pattern: /\bwave\b/i },
  { label: "W-001 label", pattern: /\bW-001\b/ },
  { label: "Recovery seam phrasing", pattern: /recovery seam/i },
  { label: "Internal contract phrasing", pattern: /internal contract/i },
  { label: "Canonical runtime phrasing", pattern: /canonical N2-A2 runtime/i },
  { label: "Contract state phrasing", pattern: /contract state/i },
];

function listFiles(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  return items.flatMap((item) => {
    const nextPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      return listFiles(nextPath);
    }
    if (!/\.(ts|tsx|md)$/u.test(item.name)) {
      return [];
    }
    return [nextPath];
  });
}

function lineAt(content, index) {
  return content.slice(0, index).split("\n").length;
}

const violations = [];

for (const sourceRoot of sourceRoots) {
  if (!fs.existsSync(sourceRoot)) {
    continue;
  }
  for (const filePath of listFiles(sourceRoot)) {
    const content = fs.readFileSync(filePath, "utf8");
    for (const rule of blockedPatterns) {
      const match = rule.pattern.exec(content);
      if (!match || match.index === undefined) {
        continue;
      }
      violations.push({
        file: path.relative(rootDir, filePath),
        line: lineAt(content, match.index),
        label: rule.label,
        sample: match[0],
      });
    }
  }
}

if (violations.length > 0) {
  console.error("Internal lexicon leakage detected:");
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} ${violation.label} -> ${violation.sample}`);
  }
  process.exit(1);
}

console.log("Product copy guard passed.");

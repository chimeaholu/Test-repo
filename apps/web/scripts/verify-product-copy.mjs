import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(process.cwd());
const sourceRoots = [
  path.join(rootDir, "app"),
  path.join(rootDir, "components"),
  path.join(rootDir, "features"),
  path.join(rootDir, "lib"),
];

const excludedPathPatterns = [
  /(^|\/)\.next(\/|$)/u,
  /(^|\/)tests(\/|$)/u,
  /\.test\.(ts|tsx)$/u,
  /(^|\/)features\/admin(\/|$)/u,
  /(^|\/)features\/finance(\/|$)/u,
  /(^|\/)features\/notifications(\/|$)/u,
  /(^|\/)features\/operations(\/|$)/u,
  /(^|\/)features\/traceability(\/|$)/u,
  /(^|\/)lib\/api(\/|$)/u,
  /(^|\/)lib\/offline(\/|$)/u,
];

const blockedPatterns = [
  { label: "Wave label", pattern: /\bwave\b/i },
  { label: "W-001 label", pattern: /\bW-001\b/ },
  { label: "Recovery seam phrasing", pattern: /recovery seam/i },
  { label: "Internal contract phrasing", pattern: /internal contract/i },
  { label: "Canonical runtime phrasing", pattern: /canonical N2-A2 runtime/i },
  { label: "Contract state phrasing", pattern: /contract state/i },
  { label: "Canonical phrasing", pattern: /\bcanonical\b/i },
  { label: "Runtime phrasing", pattern: /\bruntime\b/i },
  { label: "Actor scope phrasing", pattern: /actor scope/i },
  { label: "Replay-safe phrasing", pattern: /replay-safe/i },
  { label: "Idempotency phrasing", pattern: /idempotency/i },
  { label: "Proof posture phrasing", pattern: /proof posture/i },
  { label: "Actor-scoped phrasing", pattern: /actor-scoped/i },
];

function shouldSkipFile(filePath) {
  const relativePath = path.relative(rootDir, filePath);
  return excludedPathPatterns.some((pattern) => pattern.test(relativePath));
}

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

function findStringLiterals(content) {
  const literals = [];
  const literalPattern = /(["'`])(?:\\.|(?!\1)[^\\])*\1/gs;
  let match;

  while ((match = literalPattern.exec(content)) !== null) {
    literals.push({
      index: match.index,
      value: match[0].slice(1, -1).replace(/\$\{[^}]*\}/g, ""),
    });
  }

  return literals;
}

const violations = [];

for (const sourceRoot of sourceRoots) {
  if (!fs.existsSync(sourceRoot)) {
    continue;
  }
  for (const filePath of listFiles(sourceRoot)) {
    if (shouldSkipFile(filePath)) {
      continue;
    }
    const content = fs.readFileSync(filePath, "utf8");
    for (const literal of findStringLiterals(content)) {
      for (const rule of blockedPatterns) {
        const match = rule.pattern.exec(literal.value);
        if (!match) {
          continue;
        }
        violations.push({
          file: path.relative(rootDir, filePath),
          line: lineAt(content, literal.index),
          label: rule.label,
          sample: match[0],
        });
      }
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

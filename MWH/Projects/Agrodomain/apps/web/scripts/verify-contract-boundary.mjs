import fs from "node:fs";
import path from "node:path";

const appRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(appRoot, "app");
const componentRoot = path.join(appRoot, "components");
const featureRoot = path.join(appRoot, "features");
const libRoot = path.join(appRoot, "lib");
const roots = [sourceRoot, componentRoot, featureRoot, libRoot];

const disallowedImportChecks = [
  {
    pattern: /from\s+["']@\/lib\/contracts\/types["']/u,
    message: "imports deprecated local contract types; use @agrodomain/contracts",
  },
  {
    pattern: /from\s+["']@agrodomain\/(?:api|worker)(?:\/[^"']*)?["']/u,
    message: "imports server package internals into the web app",
  },
  {
    pattern: /from\s+["']@agrodomain\/contracts\/(?:src|dist)(?:\/[^"']*)?["']/u,
    message: "imports contract internals instead of the package root export",
  },
  {
    pattern: /from\s+["'][^"']*packages\/contracts\/(?:src|dist)[^"']*["']/u,
    message: "imports filesystem contract internals instead of the package root export",
  },
];

const disallowedTypeChecks = [
  {
    pattern: /\b(?:export\s+)?interface\s+(?:RequestEnvelope|ResponseEnvelope|EventEnvelope|RequestMetadata|ResponseMetadata|RequestCommand)\b/u,
    message: "defines a local transport envelope interface",
  },
  {
    pattern: /\b(?:export\s+)?type\s+(?:RequestEnvelope|ResponseEnvelope|EventEnvelope|RequestMetadata|ResponseMetadata|RequestCommand)\b/u,
    message: "defines a local transport envelope type alias",
  },
];

function collectFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const results = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".next" || entry.name === "node_modules") {
          continue;
        }
        stack.push(absolutePath);
        continue;
      }

      if (/\.(?:ts|tsx)$/u.test(entry.name)) {
        results.push(absolutePath);
      }
    }
  }

  return results;
}

const violations = [];

for (const filePath of roots.flatMap(collectFiles)) {
  const contents = fs.readFileSync(filePath, "utf8");

  for (const check of disallowedImportChecks) {
    if (check.pattern.test(contents)) {
      violations.push(`${path.relative(appRoot, filePath)}: ${check.message}`);
    }
  }

  for (const check of disallowedTypeChecks) {
    if (check.pattern.test(contents)) {
      violations.push(`${path.relative(appRoot, filePath)}: ${check.message}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Contract boundary violations detected:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Contract boundary verified.");

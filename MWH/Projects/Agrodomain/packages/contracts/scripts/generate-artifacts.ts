import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { zodToJsonSchema } from "zod-to-json-schema";

import { contractCatalog } from "../src/catalog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const generatedRoot = path.join(packageRoot, "generated");

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortValue(nested)]),
    );
  }
  return value;
}

async function main() {
  const components: Record<string, unknown> = {};
  const manifest = [];

  for (const contract of contractCatalog) {
    const schemaJson = sortValue(
      zodToJsonSchema(contract.schema, {
        name: contract.name,
        target: "openApi3",
        $refStrategy: "root",
      }),
    );

    const withMetadata =
      schemaJson && typeof schemaJson === "object"
        ? {
            ...schemaJson,
            description: contract.description,
            "x-agrodomain-contract": {
              id: contract.id,
              domain: contract.domain,
              kind: contract.kind,
              schema_version: contract.schemaVersion,
              traceability: contract.traceability,
              source_artifacts: contract.sourceArtifacts,
            },
          }
        : schemaJson;

    const outputDir = path.join(generatedRoot, "json-schema", contract.domain);
    const outputPath = path.join(outputDir, `${contract.name}.schema.json`);
    await mkdir(outputDir, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(withMetadata, null, 2)}\n`);

    components[contract.name] = withMetadata;
    manifest.push({
      id: contract.id,
      name: contract.name,
      domain: contract.domain,
      kind: contract.kind,
      schema_version: contract.schemaVersion,
      traceability: contract.traceability,
      source_artifacts: contract.sourceArtifacts,
      schema_path: path.relative(packageRoot, outputPath),
    });
  }

  const openApi = {
    openapi: "3.1.0",
    info: {
      title: "Agrodomain Shared Contracts",
      version: contractCatalog[0]?.schemaVersion ?? "unknown",
      description: "Wave 1 shared contract fragment generated from packages/contracts source definitions.",
    },
    components: {
      schemas: components,
    },
  };

  await mkdir(path.join(generatedRoot, "openapi"), { recursive: true });
  await writeFile(
    path.join(generatedRoot, "openapi", "contracts.openapi.json"),
    `${JSON.stringify(sortValue(openApi), null, 2)}\n`,
  );
  await writeFile(
    path.join(generatedRoot, "manifest.json"),
    `${JSON.stringify(sortValue({ generated_at: "deterministic", contracts: manifest }), null, 2)}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

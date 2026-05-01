import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) {
    return 0;
  }
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sortedValues.length) - 1),
  );
  return sortedValues[index];
}

function summarizeDurations(durations) {
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min_ms: sorted[0] ?? 0,
    p50_ms: percentile(sorted, 50),
    p95_ms: percentile(sorted, 95),
    p99_ms: percentile(sorted, 99),
    max_ms: sorted[sorted.length - 1] ?? 0,
    avg_ms:
      sorted.length === 0
        ? 0
        : Number(
            (
              sorted.reduce((accumulator, value) => accumulator + value, 0) /
              sorted.length
            ).toFixed(2),
          ),
  };
}

function buildHeaders({
  token,
  traceId,
  requestId,
  correlationId,
  idempotencyKey,
  headers = {},
}) {
  const nextHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Request-ID": requestId,
    "X-Correlation-ID": correlationId,
    ...headers,
  };
  if (traceId) {
    nextHeaders["X-Trace-ID"] = traceId;
  }
  if (idempotencyKey) {
    nextHeaders["X-Idempotency-Key"] = idempotencyKey;
  }
  if (token) {
    nextHeaders.Authorization = `Bearer ${token}`;
  }
  return nextHeaders;
}

function createRng(seedInput) {
  let seed = 0;
  for (const character of seedInput) {
    seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
  }
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function pickOne(items, rng) {
  return items[Math.floor(rng() * items.length) % items.length];
}

function nowIso() {
  return new Date().toISOString();
}

function commandEnvelope({
  actorId,
  countryCode,
  schemaVersion,
  commandName,
  aggregateRef,
  mutationScope,
  payload,
  requestId,
  idempotencyKey,
  correlationId,
  journeyIds = ["RB-070"],
  dataCheckIds = ["QG-04"],
}) {
  return {
    metadata: {
      request_id: requestId,
      idempotency_key: idempotencyKey,
      actor_id: actorId,
      country_code: countryCode,
      channel: "pwa",
      schema_version: schemaVersion,
      correlation_id: correlationId,
      occurred_at: nowIso(),
      traceability: {
        journey_ids: journeyIds,
        data_check_ids: dataCheckIds,
      },
    },
    command: {
      name: commandName,
      aggregate_ref: aggregateRef,
      mutation_scope: mutationScope,
      payload,
    },
  };
}

async function runPhase({
  phase,
  baseUrl,
  context,
  requestTimeoutMs,
  warmupSeconds,
  tag,
}) {
  const phaseStartedAt = Date.now();
  const warmupDeadline = phaseStartedAt + warmupSeconds * 1000;
  const endAt = phaseStartedAt + phase.durationSeconds * 1000;
  const results = [];
  const failures = new Map();
  const requestCounters = new Map();
  let totalRequests = 0;
  let totalErrors = 0;

  const recordFailure = (key, failure) => {
    const current = failures.get(key);
    if (current) {
      current.count += 1;
      return;
    }
    failures.set(key, { ...failure, count: 1 });
  };

  const workers = Array.from({ length: phase.concurrency }, (_, workerIndex) => {
    const workerSeed = `${phase.name}:${workerIndex}`;
    const rng = createRng(workerSeed);
    const random = () => rng();
    const randomId = (prefix) =>
      `${prefix}-${tag}-${phase.name}-${workerIndex}-${Date.now()}-${Math.floor(
        random() * 1_000_000,
      )}`;

    const request = async (
      label,
      {
        method = "GET",
        path: relativePath,
        token,
        body,
        headers,
        idempotencyKey,
        expectedStatus = 200,
      },
    ) => {
      const requestId = randomId("req");
      const correlationId = requestId;
      const traceId = requestId;
      const startedAt = process.hrtime.bigint();
      let statusCode = 0;
      let ok = false;
      let error = null;
      let data = null;
      try {
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), requestTimeoutMs);
        const response = await fetch(`${baseUrl}${relativePath}`, {
          method,
          headers: buildHeaders({
            token,
            traceId,
            requestId,
            correlationId,
            idempotencyKey,
            headers,
          }),
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timeoutHandle);
        statusCode = response.status;
        const responseText = await response.text();
        if (responseText) {
          try {
            data = JSON.parse(responseText);
          } catch {
            data = responseText;
          }
        }
        ok =
          typeof expectedStatus === "function"
            ? expectedStatus(statusCode)
            : Array.isArray(expectedStatus)
              ? expectedStatus.includes(statusCode)
              : statusCode === expectedStatus;
        if (!ok) {
          error = `unexpected_status:${statusCode}`;
        }
      } catch (caughtError) {
        error = caughtError instanceof Error ? caughtError.message : String(caughtError);
      }

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      if (Date.now() >= warmupDeadline) {
        totalRequests += 1;
        requestCounters.set(label, (requestCounters.get(label) ?? 0) + 1);
        results.push({
          label,
          durationMs,
          statusCode,
          ok,
        });
        if (!ok) {
          totalErrors += 1;
          recordFailure(`${label}:${statusCode}:${error}`, {
            label,
            statusCode,
            error,
          });
        }
      }
      return { ok, statusCode, durationMs, data };
    };

    const ctx = {
      baseUrl,
      context,
      random,
      pickOne: (items) => pickOne(items, random),
      randomId,
      request,
      nowIso,
      commandEnvelope,
    };

    return (async () => {
      while (Date.now() < endAt) {
        await phase.execute(ctx);
      }
    })();
  });

  await Promise.all(workers);

  const durationSeconds = Math.max(1, phase.durationSeconds - warmupSeconds);
  const durations = results.map((result) => result.durationMs);
  const summary = summarizeDurations(durations);
  return {
    phase: phase.name,
    concurrency: phase.concurrency,
    configured_duration_seconds: phase.durationSeconds,
    measured_duration_seconds: durationSeconds,
    total_requests: totalRequests,
    total_errors: totalErrors,
    error_rate: totalRequests === 0 ? 0 : Number((totalErrors / totalRequests).toFixed(4)),
    throughput_rps: Number((totalRequests / durationSeconds).toFixed(2)),
    latency: summary,
    request_breakdown: Array.from(requestCounters.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count),
    failures: Array.from(failures.values()).sort((left, right) => right.count - left.count),
  };
}

async function main() {
  const scenarioPath = process.argv[2];
  const contextPath = process.argv[3];
  const outputPath = process.argv[4];
  if (!scenarioPath || !contextPath || !outputPath) {
    throw new Error(
      "usage: node tests/load/harness.mjs <scenario.js> <context.json> <output.json>",
    );
  }

  const scenarioModule = await import(pathToFileURL(path.resolve(scenarioPath)).href);
  const scenario = scenarioModule.default ?? scenarioModule.scenario;
  if (!scenario) {
    throw new Error(`scenario module did not export a default scenario: ${scenarioPath}`);
  }

  const rawContext = await readFile(path.resolve(contextPath), "utf8");
  const context = JSON.parse(rawContext);
  const baseUrl = process.env.AGRO_LOAD_BASE_URL ?? "http://127.0.0.1:8010";
  const requestTimeoutMs = Number(process.env.AGRO_LOAD_TIMEOUT_MS ?? "5000");
  const warmupSeconds = Number(process.env.AGRO_LOAD_WARMUP_SECONDS ?? "3");
  const tag = process.env.AGRO_LOAD_TAG ?? "run";

  const startedAt = nowIso();
  const phaseSummaries = [];
  for (const phase of scenario.phases) {
    const summary = await runPhase({
      phase,
      baseUrl,
      context,
      requestTimeoutMs,
      warmupSeconds,
      tag,
    });
    phaseSummaries.push(summary);
  }

  const payload = {
    scenario: scenario.name,
    base_url: baseUrl,
    started_at: startedAt,
    finished_at: nowIso(),
    request_timeout_ms: requestTimeoutMs,
    warmup_seconds: warmupSeconds,
    phase_summaries: phaseSummaries,
  };
  await writeFile(path.resolve(outputPath), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

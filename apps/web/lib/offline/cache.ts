"use client";

import type { ConnectivityState } from "@agrodomain/contracts";

import {
  OFFLINE_READ_MODEL_KEY,
  readStoredJson,
  removeStoredKey,
  writeStoredJson,
} from "./storage";
import { matchOfflineReadModelPolicy } from "./policy";

export type ReadModelState = "synced" | "local" | "stale";

interface StoredReadModelRecord {
  cache_key: string;
  path: string;
  module: string;
  label: string;
  cached_at: string;
  expires_at: string;
  last_source: "live" | "cache";
  data: unknown;
}

interface StoredReadModelCatalog {
  version: 1;
  records: StoredReadModelRecord[];
}

export interface CachedReadModelSummary {
  cacheKey: string;
  label: string;
  module: string;
  path: string;
  cachedAt: string;
  state: ReadModelState;
}

const EMPTY_CATALOG: StoredReadModelCatalog = {
  version: 1,
  records: [],
};

function normalizePath(path: string): string {
  try {
    const url = new URL(path, "http://offline.local");
    url.searchParams.sort();
    return `${url.pathname}${url.search}`;
  } catch {
    return path;
  }
}

function readCatalog(): StoredReadModelCatalog {
  return readStoredJson<StoredReadModelCatalog>(OFFLINE_READ_MODEL_KEY, EMPTY_CATALOG);
}

function writeCatalog(catalog: StoredReadModelCatalog): void {
  writeStoredJson(OFFLINE_READ_MODEL_KEY, catalog);
}

function resolveReadModelState(
  record: StoredReadModelRecord,
  connectivityState: ConnectivityState,
  now = Date.now(),
): ReadModelState {
  const expiresAt = new Date(record.expires_at).getTime();
  if (Number.isFinite(expiresAt) && expiresAt < now) {
    return "stale";
  }

  if (connectivityState === "online" && record.last_source === "live") {
    return "synced";
  }

  return "local";
}

export function cacheReadModel(path: string, data: unknown): void {
  const normalizedPath = normalizePath(path);
  const policy = matchOfflineReadModelPolicy(normalizedPath);
  if (!policy) {
    return;
  }

  const catalog = readCatalog();
  const now = new Date();
  const nextRecord: StoredReadModelRecord = {
    cache_key: policy.key,
    path: normalizedPath,
    module: policy.module,
    label: policy.label,
    cached_at: now.toISOString(),
    expires_at: new Date(now.getTime() + policy.ttlMs).toISOString(),
    last_source: "live",
    data,
  };

  const records = catalog.records.filter((record) => record.path !== normalizedPath);
  records.unshift(nextRecord);

  writeCatalog({
    version: 1,
    records: records.slice(0, 20),
  });
}

export function getCachedReadModel<TData>(path: string): StoredReadModelRecord | null {
  const normalizedPath = normalizePath(path);
  const record =
    readCatalog().records.find((entry) => entry.path === normalizedPath) ?? null;

  if (!record) {
    return null;
  }

  writeCatalog({
    version: 1,
    records: readCatalog().records.map((entry) =>
      entry.path === normalizedPath
        ? { ...entry, last_source: "cache" as const }
        : entry
    ),
  });

  return record as StoredReadModelRecord & { data: TData };
}

export function listCachedReadModels(
  connectivityState: ConnectivityState,
): CachedReadModelSummary[] {
  return readCatalog().records.map((record) => ({
    cacheKey: record.cache_key,
    label: record.label,
    module: record.module,
    path: record.path,
    cachedAt: record.cached_at,
    state: resolveReadModelState(record, connectivityState),
  }));
}

export function clearCachedReadModels(): void {
  removeStoredKey(OFFLINE_READ_MODEL_KEY);
}

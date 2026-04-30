"use client";

export const OFFLINE_QUEUE_KEY = "agrodomain.offline-queue.v2";
export const OFFLINE_READ_MODEL_KEY = "agrodomain.offline-read-models.v1";
export const OFFLINE_STATE_EVENT = "agrodomain:offline-state-changed";

export function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStoredJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(OFFLINE_STATE_EVENT, { detail: { key } }));
}

export function removeStoredKey(key: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
  window.dispatchEvent(new CustomEvent(OFFLINE_STATE_EVENT, { detail: { key } }));
}

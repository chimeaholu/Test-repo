import type { TelemetryEvent } from "@agrodomain/contracts";

const events: TelemetryEvent[] = [];

export function recordTelemetry(event: TelemetryEvent): void {
  events.push(event);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("agro:telemetry", { detail: event }));
  }
}

export function listTelemetry(): TelemetryEvent[] {
  return [...events];
}

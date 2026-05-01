import type { IdentitySession } from "@agrodomain/contracts";

import type { ShipmentIssueSeverity, ShipmentSlaState, ShipmentStage } from "@/features/trucker/model";
import { recordTelemetry } from "@/lib/telemetry/client";

type TransportTelemetryEvent =
  | "transport_load_posted"
  | "transport_shipment_assigned"
  | "transport_milestone_recorded"
  | "transport_exception_reported"
  | "transport_pod_completed";

export function recordTransportTelemetry(params: {
  blocked?: boolean;
  delayMinutes?: number | null;
  event: TransportTelemetryEvent;
  exceptionCode?: string | null;
  listingId: string;
  session: IdentitySession;
  severity?: ShipmentIssueSeverity | null;
  slaState?: ShipmentSlaState | null;
  sourceSurface: "driver_mobile" | "load_wizard" | "shipment_tracking" | "transport_workspace";
  stage?: ShipmentStage | null;
  traceId: string;
}): void {
  recordTelemetry({
    event: params.event,
    trace_id: params.traceId,
    timestamp: new Date().toISOString(),
    detail: {
      actor_id: params.session.actor.actor_id,
      actor_role: params.session.actor.role,
      blocked: params.blocked ?? null,
      country_code: params.session.actor.country_code,
      delay_minutes: typeof params.delayMinutes === "number" ? params.delayMinutes : null,
      exception_code: params.exceptionCode ?? null,
      listing_id: params.listingId,
      severity: params.severity ?? null,
      sla_state: params.slaState ?? null,
      source_surface: params.sourceSurface,
      stage: params.stage ?? null,
    },
  });
}

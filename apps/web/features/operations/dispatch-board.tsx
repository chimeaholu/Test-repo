"use client";

import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { Button } from "@/components/ui/button";
import { EmptyState, InfoList, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { transportApi, type DispatchBoardRead, type TransportMatchRead, type TransportLoadRead } from "@/lib/api/transport";

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount)}`;
}

function formatEta(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Expected time pending";
  }
  return `Expected by ${date.toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
  })} UTC`;
}

function statusTone(state: string): "online" | "offline" | "degraded" | "neutral" {
  if (state === "closed" || state === "on_track") {
    return "online";
  }
  if (state === "at_risk" || state === "reassignment_ready") {
    return "degraded";
  }
  return "neutral";
}

function recommendedVehicleInfo(match: TransportMatchRead, load: TransportLoadRead): Record<string, unknown> {
  return {
    vehicle_type: load.vehicle_type_required,
    plate_number: `AG-${match.actor_id.slice(-4).toUpperCase()}`,
    capacity_tons: Math.max(Math.ceil(load.weight_tons), Math.ceil(match.capacity_tons)),
  };
}

export function DispatchBoardClient() {
  const { session, traceId } = useAppState();
  const [board, setBoard] = useState<DispatchBoardRead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    if (!session) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await transportApi.getDispatchBoard(traceId);
      setBoard(response.data);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load the dispatch board.");
    } finally {
      setIsLoading(false);
    }
  }

  async function assignCarrier(load: TransportLoadRead, match: TransportMatchRead) {
    setLoadingAction(`${load.load_id}:${match.actor_id}:assign`);
    try {
      await transportApi.dispatchAssign(
        {
          loadId: load.load_id,
          transporterActorId: match.actor_id,
          vehicleInfo: recommendedVehicleInfo(match, load),
          notes: `Assigned from cooperative dispatch board to ${match.display_name}.`,
        },
        traceId,
      );
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to assign the selected carrier.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function reassignCarrier(load: TransportLoadRead, shipmentId: string, match: TransportMatchRead) {
    setLoadingAction(`${shipmentId}:${match.actor_id}:reassign`);
    try {
      await transportApi.reassignShipment(
        {
          shipmentId,
          transporterActorId: match.actor_id,
          vehicleInfo: recommendedVehicleInfo(match, load),
          notes: `Reassigned from dispatch board to ${match.display_name}.`,
        },
        traceId,
      );
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to reassign the shipment.");
    } finally {
      setLoadingAction(null);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, traceId]);

  const groupedItems = useMemo(() => {
    const items = board?.items ?? [];
    return {
      assigned: items.filter((item) => Boolean(item.shipment)),
      atRisk: items.filter((item) => item.exception_state === "at_risk" || item.exception_state === "reassignment_ready"),
      open: items.filter((item) => !item.shipment),
    };
  }, [board]);

  if (!session) {
    return null;
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Dispatch board"
          title="Assign the right carrier and keep at-risk shipments visible"
          body="Review open loads, compare likely matches, and reassign quickly when needed."
          actions={
            <div className="pill-row">
              <StatusPill tone="neutral">Open loads {board?.summary.open_loads ?? 0}</StatusPill>
              <StatusPill tone="online">Assigned shipments {board?.summary.assigned_shipments ?? 0}</StatusPill>
              <StatusPill tone={(board?.summary.at_risk_shipments ?? 0) > 0 ? "degraded" : "neutral"}>
                At-risk shipments {board?.summary.at_risk_shipments ?? 0}
              </StatusPill>
            </div>
          }
        />
      </SurfaceCard>

      {error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {error}
          </p>
        </SurfaceCard>
      ) : null}

      {!board?.items.length ? (
        <SurfaceCard>
          <EmptyState
            title={isLoading ? "Loading dispatch work" : "No dispatch work yet"}
            body="Open loads and assigned shipments will appear here as transport work starts moving."
          />
        </SurfaceCard>
      ) : (
        <>
          <DispatchSection
            emptyBody="New loads waiting for a carrier will appear here."
            items={groupedItems.open}
            label="Open loads"
            loadingAction={loadingAction}
            onAssignCarrier={assignCarrier}
            onReassignCarrier={reassignCarrier}
          />
          <DispatchSection
            emptyBody="Assigned deliveries move here once a carrier is attached."
            items={groupedItems.assigned}
            label="Assigned shipments"
            loadingAction={loadingAction}
            onAssignCarrier={assignCarrier}
            onReassignCarrier={reassignCarrier}
          />
          <DispatchSection
            emptyBody="Late or reassignment-ready routes will appear here."
            items={groupedItems.atRisk}
            label="At-risk shipments"
            loadingAction={loadingAction}
            onAssignCarrier={assignCarrier}
            onReassignCarrier={reassignCarrier}
          />
        </>
      )}
    </div>
  );
}

function DispatchSection(props: {
  emptyBody: string;
  items: DispatchBoardRead["items"];
  label: string;
  loadingAction: string | null;
  onAssignCarrier: (load: TransportLoadRead, match: TransportMatchRead) => Promise<void>;
  onReassignCarrier: (load: TransportLoadRead, shipmentId: string, match: TransportMatchRead) => Promise<void>;
}) {
  return (
    <section className="content-stack" aria-label={props.label}>
      <SectionHeading
        eyebrow="Dispatch board"
        title={props.label}
        body={
          props.label === "Open loads"
            ? "Start with the loads that still need a carrier."
            : props.label === "Assigned shipments"
              ? "Keep active deliveries visible once a carrier is assigned."
              : "Watch the routes that may need closer follow-up or reassignment."
        }
      />

      {props.items.length ? (
        props.items.map((item) => (
          <DispatchCard
            item={item}
            key={item.load.load_id}
            loadingAction={props.loadingAction}
            onAssignCarrier={props.onAssignCarrier}
            onReassignCarrier={props.onReassignCarrier}
          />
        ))
      ) : (
        <SurfaceCard>
          <EmptyState title={`No ${props.label.toLowerCase()} yet`} body={props.emptyBody} />
        </SurfaceCard>
      )}
    </section>
  );
}

function DispatchCard(props: {
  item: DispatchBoardRead["items"][number];
  loadingAction: string | null;
  onAssignCarrier: (load: TransportLoadRead, match: TransportMatchRead) => Promise<void>;
  onReassignCarrier: (load: TransportLoadRead, shipmentId: string, match: TransportMatchRead) => Promise<void>;
}) {
  const { item } = props;
  const currentCarrier = item.shipment?.transporter_actor_id ?? item.load.assigned_transporter_actor_id;

  return (
    <SurfaceCard>
      <SectionHeading
        eyebrow={item.shipment ? "Assigned shipment" : "Open load"}
        title={`${item.load.origin_location} to ${item.load.destination_location}`}
        body={`${item.load.commodity} · ${item.load.weight_tons}t · ${formatEta(item.load.route.eta_at)}`}
        actions={
          <div className="pill-row">
            <StatusPill tone={statusTone(item.exception_state)}>{item.exception_state.replaceAll("_", " ")}</StatusPill>
            <StatusPill tone={item.load.route.provider_mode === "live" ? "online" : "degraded"}>
              {item.load.route.provider_mode === "live" ? "Live travel estimate" : "Limited updates"}
            </StatusPill>
          </div>
        }
      />

      <InfoList
        items={[
          { label: "Route distance", value: `${item.load.route.distance_km} km` },
          { label: "Travel time", value: `${item.load.route.duration_minutes} min` },
          { label: "Vehicle needed", value: item.load.vehicle_type_required },
          { label: "Budget", value: formatCurrency(item.load.price_offer, item.load.price_currency) },
          { label: "Current carrier", value: currentCarrier ?? "Waiting for assignment" },
        ]}
      />

      {item.exception_reasons.length ? (
        <div className="stack-sm" style={{ marginTop: "1rem" }}>
          <strong>Late shipment risk</strong>
          <p className="muted">{item.exception_reasons.join(" · ")}</p>
        </div>
      ) : null}

      <div className="stack-md" style={{ marginTop: "1rem" }}>
        <strong>Best match options</strong>
        {item.top_matches.length ? (
          item.top_matches.map((match) => {
            const assignKey = item.shipment ? `${item.shipment.shipment_id}:${match.actor_id}:reassign` : `${item.load.load_id}:${match.actor_id}:assign`;
            const isCurrentCarrier = match.actor_id === currentCarrier;
            return (
              <div
                key={`${item.load.load_id}:${match.actor_id}`}
                style={{
                  borderTop: "1px solid rgba(18, 24, 38, 0.08)",
                  display: "grid",
                  gap: "0.75rem",
                  paddingTop: "1rem",
                }}
              >
                <InfoList
                  items={[
                    { label: "Carrier", value: match.display_name },
                    { label: "Availability", value: `${match.availability} · ${match.availability_reason}` },
                    { label: "Match score", value: `${match.score}/100` },
                    { label: "Capacity", value: `${match.capacity_tons}t · ${match.vehicle_label}` },
                    { label: "Quote", value: formatCurrency(match.estimated_quote, item.load.price_currency) },
                  ]}
                />
                <div className="inline-actions">
                  <StatusPill tone={match.graph_context_used ? "online" : "neutral"}>
                    {match.graph_context_used ? "Best available match" : "Fallback match"}
                  </StatusPill>
                  {isCurrentCarrier ? (
                    <Button disabled size="sm" variant="ghost">
                      Assigned
                    </Button>
                  ) : item.shipment ? (
                    <Button
                      loading={props.loadingAction === assignKey}
                      onClick={() => void props.onReassignCarrier(item.load, item.shipment!.shipment_id, match)}
                      size="sm"
                      variant="secondary"
                    >
                      Reassign
                    </Button>
                  ) : (
                    <Button
                      loading={props.loadingAction === assignKey}
                      onClick={() => void props.onAssignCarrier(item.load, match)}
                      size="sm"
                    >
                      Assign carrier
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="muted">No carrier matches are available for this route yet.</p>
        )}
      </div>
    </SurfaceCard>
  );
}

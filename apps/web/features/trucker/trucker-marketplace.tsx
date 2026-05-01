"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";
import { ArrowRight, CirclePlus, PackageOpen, Route, ShieldCheck, Truck } from "lucide-react";

import { useAppState } from "@/components/app-provider";
import { EmptyState, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { truckerApi, humanizeAvailability } from "@/lib/api/trucker";
import type { TransportDriverProfile, TransportLoadCard, TransportShipmentCard, TruckerMarketplaceRole } from "@/features/trucker/model";

type ActionState =
  | { kind: "accept"; load: TransportLoadCard }
  | { kind: "request"; driver: TransportDriverProfile }
  | null;

export function TruckerMarketplace() {
  const { session, traceId } = useAppState();
  const [actionState, setActionState] = useState<ActionState>(null);
  const [availability, setAvailability] = useState<"available" | "busy" | "offline">("available");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<TruckerMarketplaceRole>("shipper");
  const [snapshot, setSnapshot] = useState<{
    availableDrivers: TransportDriverProfile[];
    availableLoads: TransportLoadCard[];
    driverShipments: TransportShipmentCard[];
    shipperShipments: TransportShipmentCard[];
  }>({
    availableDrivers: [],
    availableLoads: [],
    driverShipments: [],
    shipperShipments: [],
  });

  async function refreshWorkspace() {
    if (!session) {
      return;
    }

    setIsLoading(true);
    try {
      const next = await truckerApi.getMarketplaceSnapshotLive(session, traceId);
      setRole(next.rolePreference);
      setAvailability(next.driverAvailability);
      setSnapshot({
        availableDrivers: next.availableDrivers,
        availableLoads: next.availableLoads,
        driverShipments: next.driverShipments,
        shipperShipments: next.shipperShipments,
      });
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load the AgroTrucker workspace.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, traceId]);

  if (!session) {
    return null;
  }

  const shipperView = role === "shipper";

  return (
    <div className="trucker-stack">
      <SurfaceCard className="trucker-hero">
        <div className="trucker-hero-copy">
          <SectionHeading
            eyebrow="AgroTrucker"
            title="Match loads, track deliveries, and keep transport visible"
            body="Use AgroTrucker to move produce with clearer timing, better visibility, and proof at handoff."
          />
          <div className="trucker-pill-row">
            <StatusPill tone={snapshot.shipperShipments.length > 0 ? "online" : "neutral"}>
              Active shipments {snapshot.shipperShipments.length + snapshot.driverShipments.length}
            </StatusPill>
            <StatusPill tone={snapshot.availableLoads.length > 0 ? "degraded" : "neutral"}>
              Ready to move {snapshot.availableLoads.length}
            </StatusPill>
            <StatusPill tone={snapshot.availableDrivers.length > 0 ? "online" : "neutral"}>
              Available carriers {snapshot.availableDrivers.length}
            </StatusPill>
          </div>
        </div>

        <div className="trucker-hero-panel">
          <div className="trucker-trust-chip">
            <ShieldCheck size={18} />
            <span>Proof stays attached to every delivery</span>
          </div>
          <div className="trucker-mini-grid">
            <article>
              <span>What is moving now</span>
              <strong>Route-by-route visibility</strong>
            </article>
            <article>
              <span>What you can match next</span>
              <strong>Loads and carriers in view</strong>
            </article>
            <article>
              <span>How you close delivery</span>
              <strong>Handoff proof ready</strong>
            </article>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="trucker-tabs" role="tablist" aria-label="Transport role">
          <button
            aria-selected={shipperView}
            className={`trucker-tab${shipperView ? " active" : ""}`}
            onClick={() => {
              setRole("shipper");
              truckerApi.writeRolePreference(session, "shipper");
            }}
            role="tab"
            type="button"
          >
            <Route size={18} />
            I Need Transport
          </button>
          <button
            aria-selected={!shipperView}
            className={`trucker-tab${!shipperView ? " active" : ""}`}
            onClick={() => {
              setRole("driver");
              truckerApi.writeRolePreference(session, "driver");
            }}
            role="tab"
            type="button"
          >
            <Truck size={18} />
            I&apos;m a Driver
          </button>
        </div>
      </SurfaceCard>

      {error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {error}
          </p>
        </SurfaceCard>
      ) : null}

      {shipperView ? (
        <>
          <SurfaceCard className="trucker-primary-cta">
            <div className="trucker-cta-copy">
              <h3>Post a load and set the trip clearly.</h3>
              <p className="muted">
                Add the route, schedule, cargo details, and transport budget so the right carrier can respond.
              </p>
            </div>
            <Button href="/app/trucker/loads/new" size="lg">
              <CirclePlus size={18} />
              Post load
            </Button>
          </SurfaceCard>

          <div className="trucker-grid">
            <SurfaceCard>
              <SectionHeading
                eyebrow="Active shipments"
                title="Keep deliveries moving"
                body="See where each delivery stands, what milestone is next, and which shipment needs attention first."
              />
              {snapshot.shipperShipments.length ? (
                <div className="trucker-card-list">
                  {snapshot.shipperShipments.map((shipment) => (
                    <ShipmentCard card={shipment} key={shipment.id} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={isLoading ? "Loading shipments" : "No active shipments"}
                  body="Post a load to get started, then active deliveries will appear here with timing and handoff progress."
                  actions={
                    <Button href="/app/trucker/loads/new" variant="secondary">
                      Post your first load
                    </Button>
                  }
                />
              )}
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                eyebrow="Available drivers or loads"
                title="Best carriers to review next"
                body="Compare carrier fit, likely price, and distance before you assign the next trip."
              />
              {snapshot.availableDrivers.length ? (
                <div className="trucker-card-list">
                  {snapshot.availableDrivers.map((driver) => (
                    <article className="trucker-driver-card" key={driver.actorId}>
                      <div className="trucker-driver-head">
                        <Avatar name={driver.displayName} size="lg" />
                        <div className="trucker-driver-copy">
                          <div className="trucker-inline">
                            <strong>{driver.displayName}</strong>
                            <span className="trucker-rating">★ {driver.rating}</span>
                          </div>
                          <p className="muted">{driver.vehicleLabel}</p>
                          <p className="muted">
                            {driver.estimatedDistanceKm} km away · {humanizeAvailability(driver.availability)}
                          </p>
                        </div>
                      </div>
                      <div className="trucker-driver-foot">
                        <div>
                          <span className="trucker-eyebrow">Estimated quote</span>
                          <strong>{driver.estimatedQuote.toLocaleString()} GHS</strong>
                          <p className="muted">{driver.routeLabel.replace("->", "to")}</p>
                        </div>
                        <Button onClick={() => setActionState({ driver, kind: "request" })} variant="secondary">
                          Ask to carry load
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={isLoading ? "Loading drivers" : "No drivers available"}
                  body="No carriers are showing for this route yet. Keep the load posted and check again soon."
                />
              )}
            </SurfaceCard>
          </div>
        </>
      ) : (
        <div className="trucker-grid">
          <SurfaceCard>
            <SectionHeading
              eyebrow="Available drivers or loads"
              title="Stay ready for the next load"
              body="Keep your availability up to date so new trips reach you at the right time."
            />
            <div className="trucker-availability-card">
              <Select
                onChange={(event) => {
                  const next = event.target.value as "available" | "busy" | "offline";
                  setAvailability(next);
                  truckerApi.writeAvailability(session, next);
                }}
                options={[
                  { label: "Available", value: "available" },
                  { label: "Busy", value: "busy" },
                  { label: "Offline", value: "offline" },
                ]}
                value={availability}
              />
              <div>
                <strong>{session.actor.display_name}</strong>
                <p className="muted">{humanizeAvailability(availability)} · Carrier profile active</p>
              </div>
            </div>

            <div className="trucker-card-list">
              {snapshot.driverShipments.length ? (
                snapshot.driverShipments.map((shipment) => <ShipmentCard card={shipment} key={shipment.id} />)
              ) : (
                <EmptyState
                  title={isLoading ? "Loading deliveries" : "No active deliveries"}
                  body="Accepted loads appear here with route progress, timing, and handoff proof steps."
                />
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              eyebrow="Available drivers or loads"
              title="Available loads near you"
              body="Review route, cargo, timing, and budget before you accept the next trip."
            />
            {snapshot.availableLoads.length ? (
              <div className="trucker-card-list">
                {snapshot.availableLoads.map((load) => (
                  <article className="trucker-load-card" key={load.id}>
                    <div className="trucker-inline">
                      <div>
                        <strong>{load.routeLabel.replace("->", "to")}</strong>
                        <p className="muted">
                          {load.commodity} · {load.weightLabel}
                        </p>
                      </div>
                      <div className="trucker-load-price">{load.priceLabel}</div>
                    </div>
                    <p className="muted">
                      Pickup {load.pickupLabel} · {load.distanceLabel}
                    </p>
                    <div className="trucker-card-actions">
                      <span className="muted">Posted by {load.posterName}</span>
                      <Button onClick={() => setActionState({ kind: "accept", load })}>Accept load</Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title={isLoading ? "Loading loads" : "No loads available"}
                body="No loads are available right now. Keep your status set to Available and check again soon."
              />
            )}
          </SurfaceCard>
        </div>
      )}

      <SurfaceCard>
        <div className="trucker-detail-strip">
          <article>
            <PackageOpen size={18} />
            <div>
              <strong>Ready to move</strong>
              <p className="muted">See route, cargo, timing, and budget quickly before you commit.</p>
            </div>
          </article>
          <article>
            <ShieldCheck size={18} />
            <div>
              <strong>Transport reliability</strong>
              <p className="muted">Tracking, issue updates, and proof stay visible from pickup to handoff.</p>
            </div>
          </article>
          <article>
            <Route size={18} />
            <div>
              <strong>What to do next</strong>
              <p className="muted">Assign a carrier, accept a trip, or open tracking without digging through system detail.</p>
            </div>
          </article>
        </div>
      </SurfaceCard>

      <Modal
        footer={
          <div className="trucker-modal-actions">
            <Button onClick={() => setActionState(null)} variant="ghost">
              Cancel
            </Button>
            {actionState?.kind === "accept" ? (
              <Button
                onClick={() => {
                  void (async () => {
                    await truckerApi.acceptLoadLive(actionState.load.id, session, traceId);
                    setActionState(null);
                    await refreshWorkspace();
                  })();
                }}
              >
                Confirm load
              </Button>
            ) : actionState?.kind === "request" ? (
              <Button
                onClick={() => {
                  const activeShipment = snapshot.shipperShipments[0];
                  if (activeShipment) {
                    truckerApi.requestDriver(activeShipment.id, actionState.driver.actorId);
                  }
                  setActionState(null);
                  void refreshWorkspace();
                }}
              >
                Send request
              </Button>
            ) : null}
          </div>
        }
        onClose={() => setActionState(null)}
        open={Boolean(actionState)}
        title={actionState?.kind === "accept" ? "Accept this load?" : "Ask this driver to carry the load?"}
      >
        {actionState?.kind === "accept" ? (
          <p className="muted">
            Confirm load acceptance for {actionState.load.routeLabel.replace("->", "to")} carrying {actionState.load.commodity}
            . The shipment will move into your active deliveries immediately.
          </p>
        ) : actionState?.kind === "request" ? (
          <p className="muted">
            Send a carrier request to {actionState.driver.displayName} for {actionState.driver.routeLabel.replace("->", "to")}
            . They will see the route, cargo, and timing details before responding.
          </p>
        ) : null}
      </Modal>
    </div>
  );
}

function ShipmentCard(props: { card: TransportShipmentCard }) {
  return (
    <article className="trucker-shipment-card">
      <div className="trucker-inline trucker-inline-start">
        <div>
          <strong>{props.card.title.replace("->", "to")}</strong>
          <p className="muted">
            {props.card.commodity} · {props.card.weightLabel}
          </p>
        </div>
        <StatusPill tone={props.card.stage === "delivered" ? "online" : "degraded"}>{props.card.stageLabel}</StatusPill>
      </div>
      <div className="trucker-card-meta">
        <span>{props.card.currentCheckpoint}</span>
        <span>{props.card.etaLabel}</span>
        <span>{props.card.payLabel}</span>
      </div>
      <div className="trucker-card-actions">
        <span className="muted">{props.card.subtitle.replace("->", "to")}</span>
        <Link className="trucker-link-inline" href={props.card.trackHref}>
          Track delivery
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}

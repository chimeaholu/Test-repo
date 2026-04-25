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
      const next = await truckerApi.getMarketplaceSnapshot(session, traceId);
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
            title="Move produce with verified capacity, transparent pricing, and delivery proof."
            body="This logistics workspace sits on top of live marketplace, negotiation, and settlement data, then layers a transport control plane for routing, carrier matching, and fulfillment visibility."
          />
          <div className="trucker-pill-row">
            <StatusPill tone={snapshot.shipperShipments.length > 0 ? "online" : "neutral"}>
              Active routes {snapshot.shipperShipments.length + snapshot.driverShipments.length}
            </StatusPill>
            <StatusPill tone={snapshot.availableLoads.length > 0 ? "degraded" : "neutral"}>
              Open loads {snapshot.availableLoads.length}
            </StatusPill>
            <StatusPill tone={snapshot.availableDrivers.length > 0 ? "online" : "neutral"}>
              Verified drivers {snapshot.availableDrivers.length}
            </StatusPill>
          </div>
        </div>

        <div className="trucker-hero-panel">
          <div className="trucker-trust-chip">
            <ShieldCheck size={18} />
            <span>Verified logistics workspace</span>
          </div>
          <div className="trucker-mini-grid">
            <article>
              <span>Route coverage</span>
              <strong>National corridors</strong>
            </article>
            <article>
              <span>Pricing posture</span>
              <strong>Upfront corridor estimates</strong>
            </article>
            <article>
              <span>Proof chain</span>
              <strong>POD-ready tracking</strong>
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
              <h3>Post a load with route, timing, and budget in one flow.</h3>
              <p className="muted">
                New transport loads publish into the live marketplace and retain logistics-specific route metadata for tracking.
              </p>
            </div>
            <Button href="/app/trucker/loads/new" size="lg">
              <CirclePlus size={18} />
              Post a Load
            </Button>
          </SurfaceCard>

          <div className="trucker-grid">
            <SurfaceCard>
              <SectionHeading
                eyebrow="Live shipments"
                title="Your active shipments"
                body="Loads move here once a driver is matched or the settlement flow confirms the shipment is underway."
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
                  body="Post a load to get started, then matched carriers and in-transit updates will appear here."
                  actions={
                    <Button href="/app/trucker/loads/new" variant="secondary">
                      Create first load
                    </Button>
                  }
                />
              )}
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                eyebrow="Carrier network"
                title="Available drivers"
                body="These profiles come from the live identity layer, with route-aware quote estimates and proximity signals added in the transport workspace."
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
                          Request
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={isLoading ? "Loading drivers" : "No drivers available"}
                  body="No carrier profiles are currently available for the selected corridor. Try posting the load so drivers can respond asynchronously."
                />
              )}
            </SurfaceCard>
          </div>
        </>
      ) : (
        <div className="trucker-grid">
          <SurfaceCard>
            <SectionHeading
              eyebrow="Driver posture"
              title="Your availability"
              body="Use the live driver view to stay ready for new routes while protecting the quality of active deliveries."
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
                <p className="muted">{humanizeAvailability(availability)} · Verified transport operator</p>
              </div>
            </div>

            <div className="trucker-card-list">
              {snapshot.driverShipments.length ? (
                snapshot.driverShipments.map((shipment) => <ShipmentCard card={shipment} key={shipment.id} />)
              ) : (
                <EmptyState
                  title={isLoading ? "Loading deliveries" : "No active deliveries"}
                  body="Accepted loads move here with status updates, checkpoint history, and proof-of-delivery controls."
                />
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              eyebrow="Nearby loads"
              title="Available loads near you"
              body="Published transport loads are pulled from the live marketplace and enriched with logistics routing details for the driver workflow."
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
                      <Button onClick={() => setActionState({ kind: "accept", load })}>Accept</Button>
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
              <strong>Capacity-aware loads</strong>
              <p className="muted">Every card carries route, commodity, weight, and budget context for quick decisions on mobile.</p>
            </div>
          </article>
          <article>
            <ShieldCheck size={18} />
            <div>
              <strong>High-trust delivery chain</strong>
              <p className="muted">Tracking, issue logs, and proof-of-delivery stay attached to the same load identifier.</p>
            </div>
          </article>
          <article>
            <Route size={18} />
            <div>
              <strong>Route-first marketplace</strong>
              <p className="muted">Corridor estimates and role persistence help shippers and drivers resume work without friction.</p>
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
                  truckerApi.acceptLoad(actionState.load.id, session);
                  setActionState(null);
                  void refreshWorkspace();
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
        title={actionState?.kind === "accept" ? "Accept this load?" : "Request this driver?"}
      >
        {actionState?.kind === "accept" ? (
          <p className="muted">
            Confirm load acceptance for {actionState.load.routeLabel.replace("->", "to")} carrying {actionState.load.commodity}
            . The shipment will move into your active delivery queue immediately.
          </p>
        ) : actionState?.kind === "request" ? (
          <p className="muted">
            Send a carrier request to {actionState.driver.displayName} for {actionState.driver.routeLabel.replace("->", "to")}
            . The request is recorded in the transport workspace while the dedicated driver-request backend is still pending.
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
          Track
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}

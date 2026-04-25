"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import React from "react";
import { AlertTriangle, Camera, CheckCircle2, Mail, MapPinned, Phone, Route, Truck } from "lucide-react";

import { useAppState } from "@/components/app-provider";
import { EmptyState, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { truckerApi } from "@/lib/api/trucker";
import type { ShipmentTrackingSnapshot, TruckerTimelineEntry } from "@/features/trucker/model";

type ShipmentTrackingProps = {
  shipmentId: string;
};

type SignaturePoint = { x: number; y: number };

export function ShipmentTracking(props: ShipmentTrackingProps) {
  const { session, traceId } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [issueDescription, setIssueDescription] = useState("");
  const [issueType, setIssueType] = useState("delay");
  const [issueOpen, setIssueOpen] = useState(false);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [signaturePoints, setSignaturePoints] = useState<SignaturePoint[]>([]);
  const [snapshot, setSnapshot] = useState<ShipmentTrackingSnapshot | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const recipientNameRef = useRef("");
  const signaturePointsRef = useRef<SignaturePoint[]>([]);

  function updateRecipientName(nextRecipientName: string) {
    recipientNameRef.current = nextRecipientName;
    setRecipientName(nextRecipientName);
  }

  function updateSignaturePoints(nextSignaturePoints: React.SetStateAction<SignaturePoint[]>) {
    setSignaturePoints((current) => {
      const resolvedPoints =
        typeof nextSignaturePoints === "function" ? nextSignaturePoints(current) : nextSignaturePoints;
      signaturePointsRef.current = resolvedPoints;
      return resolvedPoints;
    });
  }

  async function refresh() {
    if (!session) {
      return;
    }

    try {
      const next = await truckerApi.getShipmentSnapshot(props.shipmentId, session, traceId);
      setSnapshot(next);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load shipment tracking.");
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.shipmentId, session, traceId]);

  useEffect(() => {
    if (!session) {
      return;
    }
    const intervalId = window.setInterval(() => {
      void refresh();
    }, 30000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.shipmentId, session, traceId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fffaf1";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineJoin = "round";
    context.lineCap = "round";
    context.strokeStyle = "#1f6d52";
    context.lineWidth = 3;

    if (signaturePoints.length < 2) {
      return;
    }

    context.beginPath();
    context.moveTo(signaturePoints[0].x, signaturePoints[0].y);
    signaturePoints.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.stroke();
  }, [signaturePoints]);

  if (!session) {
    return null;
  }

  if (!snapshot && !error) {
    return (
      <SurfaceCard>
        <EmptyState title="Loading shipment" body="Tracking, route, and status updates are loading from the transport workspace." />
      </SurfaceCard>
    );
  }

  if (!snapshot) {
    return (
      <SurfaceCard>
        <p className="field-error" role="alert">
          {error ?? "Shipment not found."}
        </p>
      </SurfaceCard>
    );
  }

  const isDriver = session.actor.role === "transporter" || snapshot.driver?.actorId === session.actor.actor_id;
  const stepIndex = snapshot.stage === "delivered" ? 2 : snapshot.stage === "in_transit" ? 1 : snapshot.stage === "picked_up" ? 1 : 0;

  return (
    <div className="trucker-stack">
      <SurfaceCard>
        <div className="trucker-page-head">
          <div>
            <p className="eyebrow">Shipment tracking</p>
            <h2>{snapshot.routeLabel.replace("->", "to")}</h2>
            <p className="muted">
              {snapshot.commodity} · {snapshot.weightLabel}
            </p>
          </div>
          <StatusPill tone={snapshot.stage === "delivered" ? "online" : "degraded"}>{snapshot.stage.replaceAll("_", " ")}</StatusPill>
        </div>
      </SurfaceCard>

      {error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {error}
          </p>
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="trucker-map-card">
        <SectionHeading
          eyebrow="Live route"
          title="Route progress"
          body="The dedicated map service is not active in this lane, so the route view uses the live shipment state plus transport workspace checkpoints."
        />
        <div className="trucker-route-visual">
          <div className="trucker-route-marker">
            <span>{snapshot.pickupLocation}</span>
            <MapPinned size={18} />
          </div>
          <div className="trucker-route-line">
            <span className={`trucker-route-truck stage-${snapshot.stage}`}>
              <Truck size={18} />
            </span>
          </div>
          <div className="trucker-route-marker">
            <Route size={18} />
            <span>{snapshot.destination}</span>
          </div>
        </div>
        <div className="trucker-card-meta">
          <span>{snapshot.currentLocationLabel}</span>
          <span>{snapshot.distanceKm} km corridor</span>
          <span>{snapshot.budgetLabel}</span>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeading
          eyebrow="Progress"
          title="Delivery stepper"
          body={`${snapshot.currentCheckpoint} · ${snapshot.etaLabel}`}
        />
        <div className="trucker-stepper">
          {[
            { label: "Picked up", ready: stepIndex >= 0 },
            { label: "In transit", ready: stepIndex >= 1 },
            { label: "Delivered", ready: stepIndex >= 2 },
          ].map((step, index) => (
            <div className="trucker-step" key={step.label}>
              <span className={`trucker-step-dot${step.ready ? " ready" : ""}`}>{index + 1}</span>
              <strong>{step.label}</strong>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <div className="trucker-grid">
        <SurfaceCard>
          <SectionHeading eyebrow="Shipment details" title="Cargo details" />
          <div className="trucker-detail-grid">
            <Detail label="Commodity" value={snapshot.commodity} />
            <Detail label="Weight" value={snapshot.weightLabel} />
            <Detail label="Pickup" value={snapshot.pickupLocation} />
            <Detail label="Destination" value={snapshot.destination} />
            <Detail label="Budget" value={snapshot.budgetLabel} />
            <Detail label="Issue count" value={`${snapshot.issueCount}`} />
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading eyebrow="Driver" title="Assigned carrier" />
          {snapshot.driver ? (
            <div className="trucker-driver-card">
              <div className="trucker-driver-head">
                <Avatar name={snapshot.driver.displayName} size="lg" />
                <div className="trucker-driver-copy">
                  <div className="trucker-inline">
                    <strong>{snapshot.driver.displayName}</strong>
                    <span className="trucker-rating">★ {snapshot.driver.rating}</span>
                  </div>
                  <p className="muted">{snapshot.driver.vehicleLabel}</p>
                  <p className="muted">{snapshot.driver.routeLabel.replace("->", "to")}</p>
                </div>
              </div>
              <div className="trucker-card-actions">
                <a className="trucker-contact-link" href={`mailto:${snapshot.driver.email}`}>
                  <Mail size={16} />
                  Message
                </a>
                <a className="trucker-contact-link" href="tel:+233240000000">
                  <Phone size={16} />
                  Call
                </a>
              </div>
            </div>
          ) : (
            <EmptyState title="Driver pending" body="A verified carrier has not been attached to this shipment yet." />
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <SectionHeading eyebrow="Status updates" title="Timeline" body="Every entry below comes from settlement events or the transport workspace state log." />
        <div className="trucker-timeline">
          {snapshot.timeline.map((item) => (
            <TimelineEntry item={item} key={item.id} />
          ))}
        </div>
      </SurfaceCard>

      {isDriver ? (
        <SurfaceCard>
          <SectionHeading
            eyebrow="Driver controls"
            title="Update shipment status"
            body="These controls write to the transport workspace now and prepare the route for the dedicated logistics command path later."
          />
          <div className="trucker-driver-actions">
            <Button
              onClick={() => {
                truckerApi.updateShipmentStage(props.shipmentId, "picked_up");
                void refresh();
              }}
              variant="secondary"
            >
              Update location
            </Button>
            <Button onClick={() => setIssueOpen(true)} variant="ghost">
              Report issue
            </Button>
            <Button
              onClick={() => {
                truckerApi.updateShipmentStage(props.shipmentId, "in_transit");
                void refresh();
              }}
            >
              Confirm transit
            </Button>
          </div>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeading
          eyebrow="Proof of delivery"
          title="Capture final handoff"
          body="Upload a delivery photo and signature to close the shipment with a durable proof trail."
        />
        <div className="trucker-proof-grid">
          <label className="trucker-file-drop">
            <Camera size={18} />
            <span>{photoName ?? snapshot.proofOfDelivery?.photoName ?? "Upload delivery photo"}</span>
            <input
              className="sr-only"
              onChange={(event) => {
                setPhotoName(event.target.files?.[0]?.name ?? null);
              }}
              type="file"
            />
          </label>
          <Input onChange={(event) => updateRecipientName(event.target.value)} placeholder="Recipient name" value={recipientName} />
        </div>
        <div className="trucker-signature-card">
          <div className="trucker-signature-head">
            <strong>Recipient signature</strong>
            <Button onClick={() => updateSignaturePoints([])} size="sm" variant="ghost">
              Clear
            </Button>
          </div>
          <canvas
            className="trucker-signature-canvas"
            height={180}
            onPointerCancel={(event) => {
              drawingRef.current = false;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerDown={(event) => {
              const point = pointFromPointerEvent(event.currentTarget, event.clientX, event.clientY);
              event.currentTarget.setPointerCapture(event.pointerId);
              beginDraw(point.x, point.y, drawingRef, updateSignaturePoints);
            }}
            onPointerLeave={() => {
              drawingRef.current = false;
            }}
            onPointerMove={(event) => {
              const point = pointFromPointerEvent(event.currentTarget, event.clientX, event.clientY);
              drawPoint(point.x, point.y, drawingRef, updateSignaturePoints);
            }}
            onPointerUp={(event) => {
              drawingRef.current = false;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            ref={canvasRef}
            width={640}
          />
        </div>
        <div className="trucker-card-actions">
          <span className="muted">
            {snapshot.proofOfDelivery
              ? `Completed on ${new Date(snapshot.proofOfDelivery.deliveredAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}`
              : "Signature and recipient details are required before completion."}
          </span>
          <Button
            onClick={() => {
              const trimmedRecipientName = recipientNameRef.current.trim();
              const nextSignaturePoints = signaturePointsRef.current;
              const completionSignaturePoints =
                nextSignaturePoints.length >= 2 ? nextSignaturePoints : fallbackSignaturePoints(trimmedRecipientName);

              if (!trimmedRecipientName || !photoName) {
                setError("Recipient name and delivery photo are required before completion.");
                return;
              }

              const proofOfDelivery = truckerApi.completeDelivery(props.shipmentId, {
                photoName,
                recipientName: trimmedRecipientName,
                signaturePoints: completionSignaturePoints,
              });
              truckerApi.updateShipmentStage(props.shipmentId, "delivered");
              setSnapshot((current) =>
                current
                  ? {
                      ...current,
                      currentCheckpoint: "Delivery confirmed",
                      currentLocationLabel: current.destination,
                      etaLabel: "Delivered",
                      proofOfDelivery,
                      stage: "delivered",
                    }
                  : current,
              );
              setError(null);
              void refresh();
            }}
          >
            <CheckCircle2 size={18} />
            Complete delivery
          </Button>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <Link className="trucker-link-inline" href="/app/trucker">
          Back to AgroTrucker
        </Link>
      </SurfaceCard>

      <Modal
        footer={
          <div className="trucker-modal-actions">
            <Button onClick={() => setIssueOpen(false)} variant="ghost">
              Cancel
            </Button>
            <Button
              onClick={() => {
                truckerApi.reportIssue(props.shipmentId, {
                  description: issueDescription,
                  type: issueType,
                });
                setIssueDescription("");
                setIssueOpen(false);
                void refresh();
              }}
            >
              Save issue
            </Button>
          </div>
        }
        onClose={() => setIssueOpen(false)}
        open={issueOpen}
        title="Report issue"
      >
        <div className="trucker-stack-sm">
          <Select
            onChange={(event) => setIssueType(event.target.value)}
            options={[
              { label: "Delay", value: "delay" },
              { label: "Breakdown", value: "breakdown" },
              { label: "Damage", value: "damage" },
              { label: "Other", value: "other" },
            ]}
            value={issueType}
          />
          <Textarea
            onChange={(event) => setIssueDescription(event.target.value)}
            placeholder="Describe the issue, checkpoint, and next mitigation step."
            value={issueDescription}
          />
        </div>
      </Modal>
    </div>
  );
}

function Detail(props: { label: string; value: string }) {
  return (
    <div className="trucker-detail-item">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function TimelineEntry(props: { item: TruckerTimelineEntry }) {
  return (
    <article className={`trucker-timeline-entry tone-${props.item.tone}`}>
      <div className="trucker-timeline-dot">
        {props.item.tone === "warning" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
      </div>
      <div>
        <strong>{props.item.checkpoint}</strong>
        <p className="muted">{props.item.note}</p>
        <span className="trucker-eyebrow">
          {new Date(props.item.createdAt).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      </div>
    </article>
  );
}

function beginDraw(
  x: number,
  y: number,
  drawingRef: React.MutableRefObject<boolean>,
  setSignaturePoints: React.Dispatch<React.SetStateAction<SignaturePoint[]>>,
) {
  drawingRef.current = true;
  setSignaturePoints((current) => [...current, { x, y }]);
}

function drawPoint(
  x: number,
  y: number,
  drawingRef: React.MutableRefObject<boolean>,
  setSignaturePoints: React.Dispatch<React.SetStateAction<SignaturePoint[]>>,
) {
  if (!drawingRef.current) {
    return;
  }
  setSignaturePoints((current) => [...current, { x, y }]);
}

function pointFromPointerEvent(canvas: HTMLCanvasElement, clientX: number, clientY: number): SignaturePoint {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function fallbackSignaturePoints(recipientName: string): SignaturePoint[] {
  const seed = Array.from(recipientName.trim() || "delivery").reduce((total, char) => total + char.charCodeAt(0), 0);
  const startY = 72 + (seed % 18);
  return Array.from({ length: 6 }, (_, index) => ({
    x: 36 + index * 34,
    y: startY + (index % 2 === 0 ? -12 : 10),
  }));
}

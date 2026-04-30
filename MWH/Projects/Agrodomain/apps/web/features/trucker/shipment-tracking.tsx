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
import type { ShipmentIssue, ShipmentTrackingSnapshot, TruckerTimelineEntry } from "@/features/trucker/model";

type ShipmentTrackingProps = {
  shipmentId: string;
};

type SignaturePoint = { x: number; y: number };

export function ShipmentTracking(props: ShipmentTrackingProps) {
  const { session, traceId } = useAppState();
  const [connectivityState, setConnectivityState] = useState<"online" | "offline">("online");
  const [error, setError] = useState<string | null>(null);
  const [issueBlocked, setIssueBlocked] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const [issueDelayMinutes, setIssueDelayMinutes] = useState("");
  const [issueSeverity, setIssueSeverity] = useState<"low" | "medium" | "high">("medium");
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
      const next = await truckerApi.getShipmentSnapshotLive(props.shipmentId, session, traceId);
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
    if (typeof window === "undefined") {
      return;
    }

    const syncConnectivity = () => {
      setConnectivityState(window.navigator.onLine ? "online" : "offline");
    };

    syncConnectivity();
    window.addEventListener("online", syncConnectivity);
    window.addEventListener("offline", syncConnectivity);
    return () => {
      window.removeEventListener("online", syncConnectivity);
      window.removeEventListener("offline", syncConnectivity);
    };
  }, []);

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
        <EmptyState title="Loading shipment" body="Route progress, timing, and handoff details are loading." />
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
  const nextStageAction =
    snapshot.stage === "accepted" || snapshot.stage === "posted"
      ? { label: "Mark picked up", note: "Pickup confirmed from the mobile driver lane.", stage: "picked_up" as const }
      : snapshot.stage === "picked_up"
        ? { label: "Mark in transit", note: "The shipment cleared the pickup handoff and entered corridor transit.", stage: "in_transit" as const }
        : { label: "Record corridor checkpoint", note: "Checkpoint confirmed from the live corridor route.", stage: "in_transit" as const };

  return (
    <div className="trucker-stack">
      <SurfaceCard>
        <div className="trucker-page-head">
          <div>
            <p className="eyebrow">Shipment tracking</p>
            <h2>{snapshot.routeLabel.replace("->", "to")}</h2>
            <p className="muted">Follow route progress, check deadlines, and close the delivery with clear proof.</p>
          </div>
          <div className="trucker-pill-row">
            <StatusPill tone={snapshot.stage === "delivered" ? "online" : "degraded"}>{snapshot.stage.replaceAll("_", " ")}</StatusPill>
            <StatusPill tone={slaTone(snapshot.slaState)}>{snapshot.slaLabel}</StatusPill>
          </div>
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
          eyebrow="Route progress"
          title="Route progress"
          body="See where this shipment stands now and what milestone comes next."
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
        <p className="muted trucker-mobile-note">
          Need more detail on the estimate? Route timing is based on the latest delivery checkpoint and available travel data.
        </p>
      </SurfaceCard>

      <div className="trucker-grid">
        <SurfaceCard>
          <SectionHeading eyebrow="Driver and carrier" title="Driver and carrier" />
          <div className="trucker-detail-grid">
            <Detail label="Commodity" value={snapshot.commodity} />
            <Detail label="Load size" value={snapshot.weightLabel} />
            <Detail label="Pickup" value={snapshot.pickupLocation} />
            <Detail label="Destination" value={snapshot.destination} />
            <Detail label="Budget" value={snapshot.budgetLabel} />
            <Detail label="Proof status" value={snapshot.podStatusLabel} />
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            eyebrow="Delivery timing"
            title="Delivery timing"
            body={`${snapshot.currentCheckpoint} · ${snapshot.etaLabel} · Last updated ${formatTimestamp(snapshot.lastUpdatedAt)}`}
          />
          <div className="trucker-detail-grid">
            <Detail label="Delivery deadline" value={formatDate(snapshot.deliveryDeadline)} />
            <Detail label="Delivery status" value={snapshot.slaLabel} />
            <Detail label="Open issues" value={`${snapshot.exceptionCount}`} />
            <Detail label="Connectivity" value={connectivityState === "online" ? "Live updates" : "Saved on device"} />
          </div>
          <p className="muted trucker-mobile-note">
            If signal drops, the current checkpoint and handoff details remain saved until the device reconnects.
          </p>
          {snapshot.issues.length ? (
            <div className="trucker-card-list">
              {snapshot.issues.map((issue) => (
                <IssueCard issue={issue} key={issue.id} />
              ))}
            </div>
          ) : (
            <p className="muted trucker-empty-inline">No delivery issues are open on this shipment.</p>
          )}
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
        <SectionHeading
          eyebrow="Route progress"
          title="Milestones"
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

      <SurfaceCard>
        <SectionHeading eyebrow="Route progress" title="Recent updates" body="See the latest delivery checkpoints and issue notes in order." />
        <div className="trucker-timeline">
          {snapshot.timeline.map((item) => (
            <TimelineEntry item={item} key={item.id} />
          ))}
        </div>
      </SurfaceCard>

      {isDriver && snapshot.stage !== "delivered" ? (
        <SurfaceCard>
          <SectionHeading
            eyebrow="Issue reporting"
            title="Keep the delivery moving"
            body="Update the next milestone, report an issue, or keep working offline until signal returns."
          />
          <div className="trucker-driver-actions">
            <Button
              onClick={() => {
                void (async () => {
                  try {
                    await truckerApi.updateShipmentStageLive(props.shipmentId, nextStageAction.stage, {
                      note: nextStageAction.note,
                      traceId,
                    });
                    setError(null);
                    await refresh();
                  } catch (nextError) {
                    setError(nextError instanceof Error ? nextError.message : "Unable to record the shipment milestone.");
                  }
                })();
              }}
              variant="secondary"
            >
              {nextStageAction.label}
            </Button>
            <Button onClick={() => setIssueOpen(true)} variant="ghost">
              Report issue
            </Button>
            <StatusPill tone={connectivityState === "online" ? "online" : "degraded"}>
              {connectivityState === "online" ? "Signal live" : "Signal offline"}
            </StatusPill>
          </div>
        </SurfaceCard>
      ) : null}

      <SurfaceCard id="pod-proof">
        <SectionHeading
          eyebrow="Proof of delivery"
          title="Capture handoff proof"
          body={`Upload a delivery photo and signature to close the shipment clearly. ${snapshot.podStatusLabel}.`}
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
              : "Recipient name, signature, and a delivery photo are required before completion."}
          </span>
          <Button
              onClick={() => {
                void (async () => {
                  try {
                    const trimmedRecipientName = recipientNameRef.current.trim();
                    const nextSignaturePoints = signaturePointsRef.current;
                    const completionSignaturePoints =
                      nextSignaturePoints.length >= 2 ? nextSignaturePoints : fallbackSignaturePoints(trimmedRecipientName);

                    if (!trimmedRecipientName || !photoName) {
                      setError("Recipient name and delivery photo are required before completion.");
                      return;
                    }

                    await truckerApi.completeDeliveryLive(props.shipmentId, {
                      photoName,
                      recipientName: trimmedRecipientName,
                      signaturePoints: completionSignaturePoints,
                    }, traceId);
                    setError(null);
                    await refresh();
                  } catch (nextError) {
                    setError(nextError instanceof Error ? nextError.message : "Unable to complete delivery.");
                  }
                })();
              }}
          >
            <CheckCircle2 size={18} />
            Complete delivery
          </Button>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <Link className="trucker-link-inline" href="/app/trucker">
          Back to transport board
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
                void (async () => {
                  if (!issueDescription.trim()) {
                    setError("Describe the issue before saving the exception.");
                    return;
                  }
                  try {
                    await truckerApi.reportIssueLive(props.shipmentId, {
                      blocked: issueBlocked,
                      delayMinutes: issueDelayMinutes ? Number(issueDelayMinutes) : null,
                      description: issueDescription.trim(),
                      severity: issueSeverity,
                      type: issueType,
                    }, traceId);
                    setIssueBlocked(false);
                    setIssueDescription("");
                    setIssueDelayMinutes("");
                    setIssueSeverity("medium");
                    setIssueOpen(false);
                    setError(null);
                    await refresh();
                  } catch (nextError) {
                    setError(nextError instanceof Error ? nextError.message : "Unable to save the exception.");
                  }
                })();
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
          <Select
            onChange={(event) => setIssueSeverity(event.target.value as "low" | "medium" | "high")}
            options={[
              { label: "Medium severity", value: "medium" },
              { label: "High severity", value: "high" },
              { label: "Low severity", value: "low" },
            ]}
            value={issueSeverity}
          />
          <Input
            onChange={(event) => setIssueDelayMinutes(event.target.value)}
            placeholder="Delay minutes (optional)"
            type="number"
            value={issueDelayMinutes}
          />
          <Textarea
            onChange={(event) => setIssueDescription(event.target.value)}
            placeholder="Describe the issue, checkpoint, and next mitigation step."
            value={issueDescription}
          />
          <label className="trucker-checkbox">
            <input checked={issueBlocked} onChange={(event) => setIssueBlocked(event.target.checked)} type="checkbox" />
            <span>Block delivery until this issue is resolved</span>
          </label>
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

function IssueCard(props: { issue: ShipmentIssue }) {
  return (
    <article className={`trucker-issue-card severity-${props.issue.severity}`}>
      <div className="trucker-inline">
        <strong>{props.issue.type.replaceAll("_", " ")}</strong>
        <StatusPill tone={props.issue.blocked ? "degraded" : "neutral"}>
          {props.issue.blocked ? "Needs attention" : "Logged"}
        </StatusPill>
      </div>
      <p className="muted">{props.issue.description}</p>
      <div className="trucker-card-meta">
        <span>{props.issue.severity} severity</span>
        <span>{props.issue.delayMinutes ? `${props.issue.delayMinutes} min delay` : "No delay logged"}</span>
        <span>{formatTimestamp(props.issue.reportedAt)}</span>
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

function formatDate(value: string): string {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
    dateStyle: "medium",
  });
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function slaTone(state: ShipmentTrackingSnapshot["slaState"]): "online" | "degraded" | "neutral" {
  if (state === "met" || state === "on_track") {
    return "online";
  }
  if (state === "at_risk" || state === "breached" || state === "missed") {
    return "degraded";
  }
  return "neutral";
}

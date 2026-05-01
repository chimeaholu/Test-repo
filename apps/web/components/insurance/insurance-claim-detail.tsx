"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Satellite } from "lucide-react";

import { useAppState } from "@/components/app-provider";
import { ClaimTimeline } from "@/components/insurance/claim-timeline";
import { Alert } from "@/components/ui/alert";
import { InfoList, SurfaceCard } from "@/components/ui-primitives";
import { insuranceApi, type InsuranceClaimDetailRecord } from "@/lib/api/insurance";

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildPolyline(points: number[]): string {
  const max = Math.max(...points, 1);
  return points
    .map((value, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - (value / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

export function InsuranceClaimDetail({ claimId }: { claimId: string }) {
  const { session, traceId } = useAppState();
  const [claim, setClaim] = useState<InsuranceClaimDetailRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    void insuranceApi
      .getClaimDetail(claimId, traceId)
      .then((response) => {
        if (!cancelled) {
          setClaim(response.data);
          setError(null);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load this claim.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [claimId, session, traceId]);

  const chartLines = useMemo(() => {
    if (!claim) {
      return null;
    }
    return {
      actual: buildPolyline(claim.rainfall_points.map((item) => item.actual)),
      expected: buildPolyline(claim.rainfall_points.map((item) => item.expected)),
      threshold: buildPolyline(claim.rainfall_points.map((item) => item.threshold)),
    };
  }, [claim]);

  if (!session) {
    return null;
  }

  if (error) {
    return (
      <div className="content-stack">
        <Alert variant="error">
          <strong>Claim unavailable.</strong>
          <p>{error}</p>
        </Alert>
      </div>
    );
  }

  if (!claim || !chartLines) {
    return (
      <div className="content-stack">
        <SurfaceCard>
          <p className="muted">Loading claim detail...</p>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="content-stack">
      <Link className="wallet-link-inline" href="/app/insurance">
        <ArrowLeft size={14} />
        Back to insurance
      </Link>

      <SurfaceCard>
        <div className="insurance-claim-head">
          <div>
            <p className="insurance-policy-kicker">Claim detail</p>
            <h1>{claim.title}</h1>
          </div>
          <span className={`insurance-claim-status status-${claim.status}`}>{claim.status}</span>
        </div>
        <ClaimTimeline stages={claim.timeline} status={claim.status} />
      </SurfaceCard>

      <div className="insurance-detail-grid">
        <SurfaceCard>
          <h2>Trigger event</h2>
          <InfoList
            items={[
              { label: "Field", value: claim.field.farm_name },
              { label: "Crop", value: claim.field.crop_type },
              { label: "Condition", value: claim.trigger_condition },
              {
                label: "Triggered",
                value: new Date(claim.reported_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
              },
            ]}
          />
          <p className="muted insurance-claim-copy">{claim.detail}</p>
        </SurfaceCard>

        <SurfaceCard>
          <h2>Payout</h2>
          <InfoList
            items={[
              { label: "Amount", value: formatMoney(claim.claim_amount, claim.currency) },
              { label: "Coverage", value: formatMoney(claim.coverage_amount, claim.currency) },
              { label: "Paid to", value: claim.payout_to },
              { label: "Reference", value: claim.payout_reference },
            ]}
          />
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <h2>Rainfall evidence</h2>
        <div className="insurance-chart">
          <svg aria-label="Rainfall comparison chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
            <polyline className="insurance-chart-line expected" fill="none" points={chartLines.expected} />
            <polyline className="insurance-chart-line actual" fill="none" points={chartLines.actual} />
            <polyline className="insurance-chart-line threshold" fill="none" points={chartLines.threshold} />
          </svg>
          <div className="insurance-chart-legend">
            <span><i className="expected" />Expected</span>
            <span><i className="actual" />Actual</span>
            <span><i className="threshold" />Threshold</span>
          </div>
        </div>
        <div className="insurance-chart-grid">
          {claim.rainfall_points.map((point) => (
            <article key={point.label}>
              <strong>{point.label}</strong>
              <p>Actual {point.actual}mm</p>
              <p>Expected {point.expected}mm</p>
            </article>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <h2>Evidence attachments</h2>
        <div className="insurance-attachments-grid">
          {claim.attachments.map((attachment) => (
            <article className="insurance-attachment-card" key={attachment.id}>
              {attachment.type === "satellite" ? <Satellite size={18} /> : <FileText size={18} />}
              <div>
                <strong>{attachment.label}</strong>
                <p>{attachment.value}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="muted insurance-source-copy">{claim.source_summary}</p>
      </SurfaceCard>
    </div>
  );
}

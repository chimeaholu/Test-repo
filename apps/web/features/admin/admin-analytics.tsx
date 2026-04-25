"use client";

import { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { InfoList, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { advisoryApi } from "@/lib/api/advisory";
import { climateApi } from "@/lib/api/climate";
import { marketplaceApi } from "@/lib/api/marketplace";
import { systemApi } from "@/lib/api/system";
import { walletApi } from "@/lib/api/wallet";

type SystemSettings = {
  app_name: string;
  environment: string;
  schema_version: string;
  request_id: string;
};

export function AdminAnalyticsClient() {
  const { queue, session, traceId } = useAppState();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [listingCount, setListingCount] = useState<number | null>(null);
  const [threadCount, setThreadCount] = useState<number | null>(null);
  const [escrowCount, setEscrowCount] = useState<number | null>(null);
  const [advisoryMode, setAdvisoryMode] = useState<"live" | "fallback">("fallback");
  const [climateMode, setClimateMode] = useState<"live" | "fallback">("fallback");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    void Promise.all([
      systemApi.getSettings(traceId),
      marketplaceApi.listListings(traceId),
      marketplaceApi.listNegotiations(traceId),
      walletApi.listEscrows(traceId),
      advisoryApi.listConversations(traceId, session.actor.locale),
      climateApi.listRuntime(traceId, session.actor.locale),
    ])
      .then(([settingsResponse, listingsResponse, negotiationsResponse, escrowsResponse, advisoryResponse, climateResponse]) => {
        if (cancelled) {
          return;
        }
        setSettings(settingsResponse.data);
        setListingCount(listingsResponse.data.items.length);
        setThreadCount(negotiationsResponse.data.items.length);
        setEscrowCount(escrowsResponse.data.items.length);
        setAdvisoryMode(advisoryResponse.data.runtime_mode);
        setClimateMode(climateResponse.data.runtime_mode);
        setError(null);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load admin analytics.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  if (!session) {
    return null;
  }

  const routeTruthHealthy = advisoryMode === "live" || climateMode === "live" || listingCount !== null;

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Admin"
          title="Release posture, route truth, and runtime health"
          body="This panel is now backed by the live app seams the release gate depends on: system settings, marketplace runtime, negotiation runtime, settlement runtime, and regulated modules."
          actions={
            <div className="pill-row">
              <StatusPill tone={routeTruthHealthy ? "online" : "degraded"}>
                {routeTruthHealthy ? "Runtime reachable" : "Runtime degraded"}
              </StatusPill>
              <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
                Queue {queue.connectivity_state}
              </StatusPill>
            </div>
          }
        />
        <div className="stat-strip">
          <article className="stat-chip">
            <span className="metric-label">Listings observed</span>
            <strong>{listingCount ?? "..."}</strong>
            <span className="muted">Runtime-backed inventory rather than route presence alone.</span>
          </article>
          <article className="stat-chip">
            <span className="metric-label">Escrows observed</span>
            <strong>{escrowCount ?? "..."}</strong>
            <span className="muted">Settlement coverage visible on the same surface as release posture.</span>
          </article>
        </div>
      </SurfaceCard>

      {error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {error}
          </p>
        </SurfaceCard>
      ) : null}

      <div className="dashboard-grid">
        <SurfaceCard>
          <SectionHeading
            eyebrow="Platform state"
            title="Canonical runtime snapshot"
            body="These values are read at page load so the admin lane can verify what deployment shape is actually serving requests."
          />
          <InfoList
            items={[
              { label: "App name", value: settings?.app_name ?? "loading" },
              { label: "Environment", value: settings?.environment ?? "loading" },
              { label: "Schema version", value: settings?.schema_version ?? "loading" },
              { label: "Request trace", value: settings?.request_id ?? traceId },
            ]}
          />
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            eyebrow="Flow coverage"
            title="Observed runtime inventory"
            body="Counts stay zero when no live data exists. They no longer rely on empty route shells to imply readiness."
          />
          <InfoList
            items={[
              { label: "Listings", value: listingCount ?? "loading" },
              { label: "Negotiation threads", value: threadCount ?? "loading" },
              { label: "Escrows", value: escrowCount ?? "loading" },
              { label: "Consent state", value: session.consent.state },
            ]}
          />
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <SectionHeading
          eyebrow="Regulated modules"
          title="Advisory and climate runtime posture"
          body="Release control needs to know which modules are truly live and which are operating in continuity mode."
        />
        <div className="pill-row">
          <StatusPill tone={advisoryMode === "live" ? "online" : "degraded"}>
            Advisory {advisoryMode === "live" ? "live" : "continuity"}
          </StatusPill>
          <StatusPill tone={climateMode === "live" ? "online" : "degraded"}>
            Climate {climateMode === "live" ? "live" : "continuity"}
          </StatusPill>
        </div>
        <InsightCallout
          title="Recovery rule"
          body="A route is only considered ready when the underlying runtime is real and the end-to-end suite passes on the deploy topology. Static reachability is not sufficient."
          tone="accent"
        />
      </SurfaceCard>
    </div>
  );
}

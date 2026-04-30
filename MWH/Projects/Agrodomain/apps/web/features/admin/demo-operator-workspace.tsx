"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppState } from "@/components/app-provider";
import { EmptyState, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { homeRouteForRole, isAppRole, roleLabel } from "@/features/shell/model";
import { identityApi, type DemoPersona } from "@/lib/api/identity";

type DemoRunbook = {
  actor_ids: string[];
  runbook_id: string;
  summary: string;
  title: string;
};

type DemoWorkspaceState = {
  items: DemoPersona[];
  runbook: DemoRunbook[];
};

export function DemoOperatorWorkspace() {
  const router = useRouter();
  const { session, traceId, updateSession } = useAppState();
  const [state, setState] = useState<DemoWorkspaceState>({ items: [], runbook: [] });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [switchingActorId, setSwitchingActorId] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.workspace?.operator_can_switch_personas) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void identityApi
      .listDemoPersonas(traceId)
      .then((response) => {
        if (!cancelled) {
          setState(response.data);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load the demo operator workspace.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.workspace?.operator_can_switch_personas, traceId]);

  const personasByActorId = useMemo(
    () =>
      new Map(state.items.map((item) => [item.actor_id, item])),
    [state.items],
  );

  async function handleSwitch(persona: DemoPersona) {
    setSwitchingActorId(persona.actor_id);
    setError(null);
    try {
      const nextSession = (await identityApi.switchDemoPersona(
        { targetActorId: persona.actor_id, targetRole: persona.role },
        traceId,
      )).data;
      updateSession(nextSession);
      router.push(homeRouteForRole(nextSession.actor.role));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to switch persona.");
    } finally {
      setSwitchingActorId(null);
    }
  }

  if (!session?.workspace?.is_demo_tenant) {
    return (
      <EmptyState
        title="Internal demo controls are unavailable."
        body="This tool only appears inside the guided product preview workspace."
      />
    );
  }

  if (!session.workspace.operator_can_switch_personas) {
    return (
      <EmptyState
        title="Use the demo operator account to guide the preview."
        body="Persona switching stays with the approved demo operator profile so live sign-in and guided previews never overlap."
      />
    );
  }

  return (
    <div className="content-stack">
      <SurfaceCard className="hero-surface">
        <SectionHeading
          eyebrow="Internal demo controls"
          title="Guide the product preview without losing the boundary"
          body="Use this internal tool to move through guided demo journeys and switch between approved sample personas."
          actions={
            <div className="pill-row">
              <StatusPill tone="degraded">Guided preview</StatusPill>
              <StatusPill tone="neutral">Sample personas only</StatusPill>
            </div>
          }
        />
        <div className="inline-actions">
          <Link className="button-secondary" href="/app/admin">
            Return to demo home
          </Link>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="stack-sm">
          <SectionHeading
            eyebrow="Active demo journey"
            title="Keep the boundary visible during every walkthrough"
            body="Use the active sample journey, keep the watermark visible, and return to the operator view between role handoffs."
          />
          <div className="pill-row">
            <StatusPill tone="degraded">Boundary visible</StatusPill>
            <StatusPill tone="neutral">Sample data only</StatusPill>
          </div>
          <p className="muted">{session.workspace.watermark}</p>
          {error ? <p role="alert">{error}</p> : null}
        </div>
      </SurfaceCard>

      <div className="content-stack">
        {state.runbook.map((runbook) => (
          <SurfaceCard key={runbook.runbook_id}>
            <div className="stack-sm">
              <SectionHeading eyebrow="Sample personas" title={runbook.title} body={runbook.summary} />
              <div className="stack-sm">
                {runbook.actor_ids
                  .map((actorId) => personasByActorId.get(actorId))
                  .filter((persona): persona is DemoPersona => Boolean(persona))
                  .map((persona) => {
                    const isActive = session.actor.actor_id === persona.actor_id;
                    return (
                      <div className="inline-actions" key={persona.actor_id}>
                        <div className="stack-sm">
                          <strong>{persona.display_name}</strong>
                          <span className="muted">
                            {isAppRole(persona.role) ? roleLabel(persona.role) : persona.role} · {persona.country_code} · {persona.scenario_summary}
                          </span>
                        </div>
                        <div className="pill-row">
                          <StatusPill tone={persona.operator ? "neutral" : "degraded"}>
                            {persona.scenario_label}
                          </StatusPill>
                          <button
                            className={isActive ? "button-secondary" : "button-primary"}
                            disabled={switchingActorId === persona.actor_id || isActive}
                            onClick={() => void handleSwitch(persona)}
                            type="button"
                          >
                            {isActive
                              ? "Current persona"
                              : switchingActorId === persona.actor_id
                                ? "Switching..."
                                : "Switch persona"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </SurfaceCard>
        ))}
      </div>

      <SurfaceCard>
        <SectionHeading
          eyebrow="Demo rules"
          title="Keep every preview safe and easy to explain"
          body="These rules keep the guided preview clear for customers while preserving the operator boundary."
        />
        <div className="stack-sm">
          <p className="muted">Stay inside approved sample personas and sample organizations only.</p>
          <p className="muted">Keep the demo watermark visible whenever you move into another workspace.</p>
          <p className="muted">Return to the operator view when you finish a journey or prepare the next handoff.</p>
        </div>
      </SurfaceCard>

      {!isLoading && state.items.length === 0 ? (
        <EmptyState
          title="No sample personas are ready right now."
          body="Refresh the guided demo data to restore the sample journeys for this preview workspace."
        />
      ) : null}
      {isLoading ? (
        <SurfaceCard>
          <p className="muted">Loading guided demo journeys and sample personas...</p>
        </SurfaceCard>
      ) : null}
    </div>
  );
}

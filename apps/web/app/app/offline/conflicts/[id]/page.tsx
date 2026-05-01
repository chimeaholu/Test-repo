"use client";

import { useParams } from "next/navigation";

import { useAppState } from "@/components/app-provider";
import { InfoList, InsightCallout, SectionHeading, SurfaceCard } from "@/components/ui-primitives";

const conflictCopy = {
  device_binding_changed: {
    action: "Rebind device",
    detail: "The device or session binding changed. Require a fresh authenticated device trust step.",
  },
  duplicate_commit: {
    action: "Apply server result",
    detail: "The operation already succeeded upstream. The client should reconcile to the server result.",
  },
  policy_challenge: {
    action: "Escalate to review",
    detail: "A policy challenge blocked automatic replay. Route to manual review rather than silent retry.",
  },
  session_refresh_required: {
    action: "Refresh session",
    detail: "The session expired during replay. Refresh the session and reattempt in order.",
  },
  session_revoked: {
    action: "Re-authenticate",
    detail: "Consent or session access was revoked. Protected actions must remain blocked.",
  },
  version_mismatch: {
    action: "Apply server version",
    detail: "A newer server version exists. Present the authoritative version before allowing another edit.",
  },
} as const;

export default function ConflictPage() {
  const { id } = useParams<{ id: string }>();
  const { queue } = useAppState();
  const item = queue.items.find((entry) => entry.item_id === id);

  if (!item) {
    return (
      <section className="surface-card">
        <h2>Conflict not found</h2>
      </section>
    );
  }

  const conflict = item.conflict_code ? conflictCopy[item.conflict_code] : null;

  return (
    <>
      <SurfaceCard>
        <SectionHeading
          eyebrow="Recovery workspace"
          title={item.intent}
          body="Conflict guidance is tied to the recorded error so recovery stays consistent across replay attempts and device states."
        />
      </SurfaceCard>

      <div className="queue-grid">
        <article className="queue-card">
          <SectionHeading eyebrow="Conflict details" title="Recovery data" />
          <InfoList
            items={[
              { label: "Item ID", value: item.item_id },
              { label: "Conflict code", value: item.conflict_code ?? "none" },
              { label: "Recommended action", value: conflict?.action ?? "Retry later" },
              { label: "Envelope request", value: item.envelope.metadata.request_id },
              { label: "Schema version", value: item.envelope.metadata.schema_version },
            ]}
          />
        </article>

        <article className="queue-card">
          <SectionHeading eyebrow="Operator guidance" title="What to do next" />
          <InsightCallout
            title="Conflict guidance"
            body={conflict?.detail ?? "Inspect queue metadata and retry when safe."}
            tone="accent"
          />
          <pre style={{ overflowX: "auto", whiteSpace: "pre-wrap" }}>
            {JSON.stringify(item.envelope, null, 2)}
          </pre>
        </article>
      </div>
    </>
  );
}

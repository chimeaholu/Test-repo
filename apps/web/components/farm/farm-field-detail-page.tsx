"use client";

import React, { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { PageHeader } from "@/components/molecules";
import { Alert, Button, Modal } from "@/components/ui";
import { ActivityForm } from "./activity-form";
import { FieldDetail } from "./field-detail";
import { farmApi, type FarmWorkspace, type LogActivityInput } from "@/lib/api/farm";

export function FarmFieldDetailPage({ fieldId }: { fieldId: string }) {
  const { session, traceId } = useAppState();
  const [workspace, setWorkspace] = useState<FarmWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityOpen, setActivityOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    void farmApi
      .getWorkspace(traceId, session.actor.locale)
      .then((response) => {
        if (!cancelled) {
          setWorkspace(response.data);
          setError(null);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load this field.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  const field = workspace?.fields.find((item) => item.fieldId === fieldId) ?? null;

  async function handleLogActivity(input: LogActivityInput): Promise<void> {
    if (!workspace) {
      return;
    }

    const response = await farmApi.logActivity(workspace.farm.farmId, input, traceId);
    setWorkspace({
      ...workspace,
      activities: [response.data, ...workspace.activities],
    });
    setActivityOpen(false);
  }

  return (
    <div className="farm-detail-page">
      <PageHeader
        actions={
          <>
            <Button href="/app/farm" variant="ghost">
              Back to farm
            </Button>
            <Button onClick={() => setActivityOpen(true)}>Log activity</Button>
          </>
        }
        breadcrumbs={[
          { href: "/app/farm", label: "Farm" },
          { label: field?.name ?? "Field detail" },
        ]}
        description="The field view keeps the boundary, crop cycle, weather signal, and operation log together so the next action is obvious."
        title={field?.name ?? "Field detail"}
      />

      {loading ? <p className="farm-loading">Loading field detail...</p> : null}
      {error ? (
        <Alert variant="error">
          <strong>Field detail issue</strong>
          <div>{error}</div>
        </Alert>
      ) : null}
      {workspace && field ? <FieldDetail field={field} onLogActivity={() => setActivityOpen(true)} workspace={workspace} /> : null}

      <Modal onClose={() => setActivityOpen(false)} open={activityOpen && Boolean(field)} size="lg" title="Log field activity">
        {field && workspace ? (
          <ActivityForm field={field} inputs={workspace.inputs} onCancel={() => setActivityOpen(false)} onSubmit={handleLogActivity} />
        ) : null}
      </Modal>
    </div>
  );
}

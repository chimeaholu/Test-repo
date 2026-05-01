"use client";

import React, { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { MetricGrid, PageHeader } from "@/components/molecules";
import { Alert, Badge, Button, Card, Modal } from "@/components/ui";
import { AddFieldFlow } from "./add-field-flow";
import { ActivityForm } from "./activity-form";
import { ActivityLog } from "./activity-log";
import { CropCycleTimeline } from "./crop-cycle-timeline";
import { FarmMap } from "./farm-map";
import { FieldCard } from "./field-card";
import { InputTracker } from "./input-tracker";
import { FieldIcon, LeafIcon, TractorIcon, WalletIcon } from "@/components/icons";
import { farmApi, type AddFieldInput, type FarmWorkspace, type LogActivityInput } from "@/lib/api/farm";

export function FarmOperationsHome() {
  const { session, traceId } = useAppState();
  const [workspace, setWorkspace] = useState<FarmWorkspace | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [addFieldOpen, setAddFieldOpen] = useState(false);
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
        if (cancelled) {
          return;
        }
        setWorkspace(response.data);
        setSelectedFieldId((current) => current ?? response.data.fields[0]?.fieldId ?? null);
        setError(null);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load the farm workspace.");
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

  if (!session) {
    return null;
  }

  const selectedField = workspace?.fields.find((field) => field.fieldId === selectedFieldId) ?? workspace?.fields[0] ?? null;
  const nextHarvest = workspace?.fields
    .map((field) => new Date(field.expectedHarvestDate).getTime())
    .sort((left, right) => left - right)[0];
  const lowStockCount = workspace?.inputs.filter((input) => input.quantity <= input.reorderLevel).length ?? 0;
  const metrics = workspace
    ? [
        { icon: <FieldIcon size={18} />, label: "Managed area", value: `${workspace.farm.hectares.toFixed(1)} ha` },
        { icon: <LeafIcon size={18} />, label: "Active fields", value: workspace.fields.filter((field) => field.status === "active").length },
        { icon: <TractorIcon size={18} />, label: "Current season", value: workspace.farm.currentSeason },
        {
          icon: <WalletIcon size={18} />,
          label: "Next harvest",
          value: nextHarvest ? new Date(nextHarvest).toLocaleDateString() : "Pending",
        },
      ]
    : [];

  async function handleAddField(input: AddFieldInput): Promise<void> {
    if (!workspace) {
      return;
    }

    const response = await farmApi.addField(workspace.farm.farmId, input, traceId);
    setWorkspace((current) =>
      current
        ? {
            ...current,
            fields: [response.data, ...current.fields],
          }
        : current,
    );
    setSelectedFieldId(response.data.fieldId);
    setAddFieldOpen(false);
  }

  async function handleLogActivity(input: LogActivityInput): Promise<void> {
    if (!workspace) {
      return;
    }

    const response = await farmApi.logActivity(workspace.farm.farmId, input, traceId);
    setWorkspace((current) =>
      current
        ? {
            ...current,
            activities: [response.data, ...current.activities],
            fields: current.fields.map((field) =>
              field.fieldId === input.fieldId
                ? {
                    ...field,
                    activityCount: field.activityCount + 1,
                    lastActivityAt: response.data.date,
                    lastActivityType: response.data.activityType,
                  }
                : field,
            ),
          }
        : current,
    );
    setActivityOpen(false);
  }

  return (
    <div className="farm-home">
      <PageHeader
        actions={
          <>
            <Button onClick={() => setActivityOpen(true)} variant="ghost">
              Log field activity
            </Button>
            <Button onClick={() => setAddFieldOpen(true)}>Add field</Button>
          </>
        }
        breadcrumbs={[
          { href: "/app/farmer", label: "Farmer" },
          { label: "Farm" },
        ]}
        description="See which field needs attention, what work is coming next, and which resources are running low."
        title="Keep your fields, season work, and inputs in one working view"
      />

      {workspace ? (
        <Card className="farm-hero" variant="elevated">
          <div className="farm-hero-copy">
            <p className="farm-kicker">Farm overview</p>
            <h2>{workspace.farm.farmName}</h2>
            <p>
              {workspace.farm.district} · {workspace.farm.primaryCrop} season
            </p>
          </div>
          <div className="farm-hero-meta">
            <Badge variant={workspace.farm.mode === "live" ? "success" : "warning"}>
              {workspace.farm.mode === "live" ? "Ready" : "Limited updates"}
            </Badge>
            <Badge variant="info">Next harvest in view</Badge>
          </div>
          <p className="farm-hero-alert">{workspace.weather.alertSummary}</p>
        </Card>
      ) : null}

      {error ? (
        <Alert variant="error">
          <strong>Farm workspace issue</strong>
          <div>{error}</div>
        </Alert>
      ) : null}

      {workspace ? <MetricGrid metrics={metrics} /> : null}

      {loading ? (
        <Card>
          <p className="farm-loading">Loading farm workspace...</p>
        </Card>
      ) : null}

      {workspace && selectedField ? (
        <>
          <div className="farm-home-grid">
            <Card className="farm-home-primary" variant="elevated">
              <div className="farm-section-head">
                <div>
                  <p className="farm-kicker">Field layout</p>
                  <h3>Fields</h3>
                </div>
                <div className="farm-toggle-row">
                  <Button onClick={() => setViewMode("map")} size="sm" variant={viewMode === "map" ? "primary" : "ghost"}>
                    Map
                  </Button>
                  <Button onClick={() => setViewMode("list")} size="sm" variant={viewMode === "list" ? "primary" : "ghost"}>
                    List
                  </Button>
                </div>
              </div>

              {viewMode === "map" ? (
                <FarmMap fields={workspace.fields} onSelect={setSelectedFieldId} selectedFieldId={selectedField.fieldId} />
              ) : (
                <div className="farm-card-list">
                  {workspace.fields.map((field) => (
                    <FieldCard
                      field={field}
                      href={`/app/farm/fields/${field.fieldId}`}
                      key={field.fieldId}
                      selected={field.fieldId === selectedField.fieldId}
                    />
                  ))}
                </div>
              )}
            </Card>

            <div className="farm-home-rail">
              <Card className="farm-rail-card">
                <div className="farm-section-head">
                  <div>
                    <p className="farm-kicker">Selected field</p>
                    <h3>{selectedField.name}</h3>
                  </div>
                  <Badge variant={selectedField.status === "active" ? "success" : "warning"}>
                    {selectedField.status}
                  </Badge>
                </div>
                <div className="farm-summary-list">
                  <div className="farm-summary-pair">
                    <span>Crop</span>
                    <strong>
                      {selectedField.currentCrop} · {selectedField.variety}
                    </strong>
                  </div>
                  <div className="farm-summary-pair">
                    <span>Area</span>
                    <strong>{selectedField.areaHectares.toFixed(1)} hectares</strong>
                  </div>
                  <div className="farm-summary-pair">
                    <span>Current field state</span>
                    <strong>{selectedField.nextTask}</strong>
                  </div>
                  <div className="farm-summary-pair">
                    <span>Weather risk</span>
                    <strong>{selectedField.healthSummary}</strong>
                  </div>
                </div>
                <div className="farm-rail-actions">
                  <Button href={`/app/farm/fields/${selectedField.fieldId}`}>Open field</Button>
                  <Button href="/app/farm/inputs" variant="ghost">
                    View inputs
                  </Button>
                </div>
              </Card>

              <Card className="farm-rail-card">
                <div className="farm-section-head">
                  <div>
                    <p className="farm-kicker">Inputs and season status</p>
                    <h3>Inputs running low</h3>
                  </div>
                  <Badge variant={lowStockCount > 0 ? "warning" : "success"}>
                    {lowStockCount > 0 ? `${lowStockCount} low` : "stable"}
                  </Badge>
                </div>
                <p className="farm-rail-note">
                  {lowStockCount > 0
                    ? "One or more inputs are close to the reorder level. Replenish before the next field task."
                    : "No inputs are currently running low."}
                </p>
              </Card>
            </div>
          </div>

          <div className="farm-home-detail-grid">
            <ActivityLog activities={workspace.activities} fieldId={selectedField.fieldId} limit={4} />
            <CropCycleTimeline cycles={workspace.cropCycles} fieldId={selectedField.fieldId} />
          </div>

          <InputTracker activities={workspace.activities} compact inputs={workspace.inputs} />
        </>
      ) : null}

      <Modal onClose={() => setAddFieldOpen(false)} open={addFieldOpen} size="lg" title="Add field">
        <AddFieldFlow onCancel={() => setAddFieldOpen(false)} onSubmit={handleAddField} />
      </Modal>

      <Modal onClose={() => setActivityOpen(false)} open={activityOpen && Boolean(selectedField)} size="lg" title="Log field activity">
        {selectedField && workspace ? (
          <ActivityForm
            field={selectedField}
            inputs={workspace.inputs}
            onCancel={() => setActivityOpen(false)}
            onSubmit={handleLogActivity}
          />
        ) : null}
      </Modal>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { MetricGrid, PageHeader } from "@/components/molecules";
import { Button, Input, Modal, Select } from "@/components/ui";
import { InputTracker } from "./input-tracker";
import { farmApi, type AddInputInput, type FarmWorkspace } from "@/lib/api/farm";

const inputTypeOptions = [
  { label: "Seed", value: "seed" },
  { label: "Fertilizer", value: "fertilizer" },
  { label: "Pesticide", value: "pesticide" },
  { label: "Herbicide", value: "herbicide" },
  { label: "Fuel", value: "fuel" },
  { label: "Other", value: "other" },
];

function AddInputForm(props: {
  onCancel: () => void;
  onSubmit: (input: AddInputInput) => Promise<void>;
}) {
  const [inputType, setInputType] = useState<AddInputInput["inputType"]>("fertilizer");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [unit, setUnit] = useState("bags");
  const [cost, setCost] = useState("0");
  const [supplier, setSupplier] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState("");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await props.onSubmit({
        cost: Number(cost) || 0,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        inputType,
        name,
        purchaseDate: new Date(purchaseDate).toISOString(),
        quantity: Number(quantity) || 0,
        reorderLevel: Number(reorderLevel) || 0,
        supplier,
        unit,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="farm-form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="farm-form-grid">
        <label className="farm-form-field">
          <span>Input type</span>
          <Select onChange={(event) => setInputType(event.target.value as AddInputInput["inputType"])} options={inputTypeOptions} value={inputType} />
        </label>
        <label className="farm-form-field">
          <span>Name</span>
          <Input onChange={(event) => setName(event.target.value)} required value={name} />
        </label>
        <label className="farm-form-field">
          <span>Quantity</span>
          <Input onChange={(event) => setQuantity(event.target.value)} step="0.1" type="number" value={quantity} />
        </label>
        <label className="farm-form-field">
          <span>Unit</span>
          <Input onChange={(event) => setUnit(event.target.value)} value={unit} />
        </label>
        <label className="farm-form-field">
          <span>Cost</span>
          <Input onChange={(event) => setCost(event.target.value)} step="0.01" type="number" value={cost} />
        </label>
        <label className="farm-form-field">
          <span>Supplier</span>
          <Input onChange={(event) => setSupplier(event.target.value)} value={supplier} />
        </label>
        <label className="farm-form-field">
          <span>Purchase date</span>
          <Input onChange={(event) => setPurchaseDate(event.target.value)} type="date" value={purchaseDate} />
        </label>
        <label className="farm-form-field">
          <span>Expiry date</span>
          <Input onChange={(event) => setExpiryDate(event.target.value)} type="date" value={expiryDate} />
        </label>
        <label className="farm-form-field">
          <span>Reorder level</span>
          <Input onChange={(event) => setReorderLevel(event.target.value)} step="0.1" type="number" value={reorderLevel} />
        </label>
      </div>

      <div className="farm-form-actions">
        <Button onClick={props.onCancel} type="button" variant="ghost">
          Cancel
        </Button>
        <Button loading={submitting} type="submit">
          Save input
        </Button>
      </div>
    </form>
  );
}

export function FarmInputsPage() {
  const { session, traceId } = useAppState();
  const [workspace, setWorkspace] = useState<FarmWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

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

  async function handleAddInput(input: AddInputInput): Promise<void> {
    if (!workspace) {
      return;
    }

    const response = await farmApi.addInput(workspace.farm.farmId, input, traceId);
    setWorkspace({
      ...workspace,
      inputs: [response.data, ...workspace.inputs],
    });
    setAddOpen(false);
  }

  const metrics = workspace
    ? [
        { label: "Inventory lines", value: workspace.inputs.length },
        { label: "Low stock", value: workspace.inputs.filter((input) => input.quantity <= input.reorderLevel).length },
        { label: "Expiring soon", value: workspace.inputs.filter((input) => input.expiryDate).length },
      ]
    : [];

  return (
    <div className="farm-input-page">
      <PageHeader
        actions={<Button onClick={() => setAddOpen(true)}>Add input</Button>}
        breadcrumbs={[
          { href: "/app/farm", label: "Farm" },
          { label: "Inputs" },
        ]}
        description="See what is in stock, what is low, and what needs replacing soon."
        title="Input inventory"
      />

      {workspace ? <MetricGrid metrics={metrics} /> : null}
      {loading ? <p className="farm-loading">Loading inventory...</p> : null}
      {workspace ? <InputTracker activities={workspace.activities} inputs={workspace.inputs} onAddRequested={() => setAddOpen(true)} /> : null}

      <Modal onClose={() => setAddOpen(false)} open={addOpen} size="lg" title="Add input">
        <AddInputForm onCancel={() => setAddOpen(false)} onSubmit={handleAddInput} />
      </Modal>
    </div>
  );
}

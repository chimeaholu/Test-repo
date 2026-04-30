"use client";

import React, { useState } from "react";

import { Button, Input, Select, Textarea } from "@/components/ui";
import type { FarmField, FarmInput, LogActivityInput } from "@/lib/api/farm";

interface ActivityFormProps {
  field: FarmField;
  inputs: FarmInput[];
  onCancel: () => void;
  onSubmit: (input: LogActivityInput) => Promise<void>;
}

const activityOptions = [
  { label: "Planting", value: "planting" },
  { label: "Weeding", value: "weeding" },
  { label: "Fertilizing", value: "fertilizing" },
  { label: "Spraying", value: "spraying" },
  { label: "Irrigating", value: "irrigating" },
  { label: "Harvesting", value: "harvesting" },
  { label: "Scouting", value: "scouting" },
  { label: "Other", value: "other" },
];

export function ActivityForm({ field, inputs, onCancel, onSubmit }: ActivityFormProps) {
  const [activityType, setActivityType] = useState<LogActivityInput["activityType"]>("scouting");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [laborHours, setLaborHours] = useState("2");
  const [cost, setCost] = useState("0");
  const [selectedInputs, setSelectedInputs] = useState<string[]>([]);
  const [photoLabel, setPhotoLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        activityType,
        cost: Number(cost) || 0,
        date: new Date(date).toISOString(),
        description,
        fieldId: field.fieldId,
        inputsUsed: selectedInputs,
        laborHours: Number(laborHours) || 0,
        notes,
        photoLabel: photoLabel || null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="farm-form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="farm-form-grid">
        <label className="farm-form-field">
          <span>Field</span>
          <Input disabled value={field.name} />
        </label>
        <label className="farm-form-field">
          <span>Activity type</span>
          <Select
            onChange={(event) => setActivityType(event.target.value as LogActivityInput["activityType"])}
            options={activityOptions}
            value={activityType}
          />
        </label>
        <label className="farm-form-field">
          <span>Date</span>
          <Input onChange={(event) => setDate(event.target.value)} type="date" value={date} />
        </label>
        <label className="farm-form-field">
          <span>Labour hours</span>
          <Input min="0" onChange={(event) => setLaborHours(event.target.value)} step="0.5" type="number" value={laborHours} />
        </label>
      </div>

      <label className="farm-form-field">
        <span>Description</span>
        <Input onChange={(event) => setDescription(event.target.value)} required value={description} />
      </label>

      <label className="farm-form-field">
        <span>Notes</span>
        <Textarea onChange={(event) => setNotes(event.target.value)} value={notes} />
      </label>

      <div className="farm-form-grid">
        <label className="farm-form-field">
          <span>Cost</span>
          <Input min="0" onChange={(event) => setCost(event.target.value)} step="0.01" type="number" value={cost} />
        </label>
        <label className="farm-form-field">
          <span>Photo label</span>
          <Input onChange={(event) => setPhotoLabel(event.target.value)} placeholder="e.g. canopy-check-north-ridge" value={photoLabel} />
        </label>
      </div>

      <fieldset className="farm-form-field">
        <span>Inputs used</span>
        <div className="farm-checkbox-grid">
          {inputs.map((item) => {
            const checked = selectedInputs.includes(item.name);
            return (
              <label className="farm-checkbox-item" key={item.inputId}>
                <input
                  checked={checked}
                  onChange={() =>
                    setSelectedInputs((current) =>
                      checked ? current.filter((value) => value !== item.name) : [...current, item.name],
                    )
                  }
                  type="checkbox"
                />
                <span>
                  {item.name} · {item.quantity} {item.unit}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="farm-form-actions">
        <Button onClick={onCancel} type="button" variant="ghost">
          Cancel
        </Button>
        <Button loading={submitting} type="submit">
          Save activity
        </Button>
      </div>
    </form>
  );
}

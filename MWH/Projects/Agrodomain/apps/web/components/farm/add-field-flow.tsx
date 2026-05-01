"use client";

import React, { useState } from "react";

import { Button, Input, Select } from "@/components/ui";
import type { AddFieldInput, BoundaryPoint } from "@/lib/api/farm";

interface AddFieldFlowProps {
  onCancel: () => void;
  onSubmit: (input: AddFieldInput) => Promise<void>;
}

const soilOptions = [
  { label: "Loam", value: "Loam" },
  { label: "Sandy loam", value: "Sandy loam" },
  { label: "Clay loam", value: "Clay loam" },
];

const irrigationOptions = [
  { label: "Rain fed", value: "Rain fed" },
  { label: "Drip assisted", value: "Drip assisted" },
  { label: "Manual hose set", value: "Manual hose set" },
];

function boundaryFromSelection(selectedCells: string[]): BoundaryPoint[] {
  if (selectedCells.length === 0) {
    return [];
  }

  const cells = selectedCells.map((cell) => cell.split("-").map((value) => Number(value)));
  const rows = cells.map(([row]) => row);
  const cols = cells.map(([, col]) => col);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  const baseLat = 9.4034;
  const baseLng = -0.8424;

  return [
    { lat: baseLat + minRow * 0.002, lng: baseLng + minCol * 0.002 },
    { lat: baseLat + minRow * 0.002, lng: baseLng + (maxCol + 1) * 0.002 },
    { lat: baseLat + (maxRow + 1) * 0.002, lng: baseLng + (maxCol + 1) * 0.002 },
    { lat: baseLat + (maxRow + 1) * 0.002, lng: baseLng + minCol * 0.002 },
  ];
}

export function AddFieldFlow({ onCancel, onSubmit }: AddFieldFlowProps) {
  const [mode, setMode] = useState<"sketch" | "manual">("sketch");
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("Tamale Metropolitan");
  const [areaHectares, setAreaHectares] = useState("2.4");
  const [currentCrop, setCurrentCrop] = useState("Maize");
  const [variety, setVariety] = useState("Hybrid");
  const [soilType, setSoilType] = useState("Loam");
  const [irrigationType, setIrrigationType] = useState("Rain fed");
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedHarvestDate, setExpectedHarvestDate] = useState(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [selectedCells, setSelectedCells] = useState<string[]>(["0-0", "0-1", "1-0", "1-1"]);
  const [submitting, setSubmitting] = useState(false);

  const boundary = mode === "sketch" ? boundaryFromSelection(selectedCells) : boundaryFromSelection(["1-1", "1-2", "2-1", "2-2"]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        areaHectares: Number(areaHectares) || 0,
        boundary,
        currentCrop,
        district,
        expectedHarvestDate: new Date(expectedHarvestDate).toISOString(),
        irrigationType,
        name,
        plantingDate: new Date(plantingDate).toISOString(),
        soilType,
        variety,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="farm-form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="farm-toggle-row">
        <Button onClick={() => setMode("sketch")} type="button" variant={mode === "sketch" ? "primary" : "ghost"}>
          Boundary sketch
        </Button>
        <Button onClick={() => setMode("manual")} type="button" variant={mode === "manual" ? "primary" : "ghost"}>
          Manual entry
        </Button>
      </div>

      {mode === "sketch" ? (
        <div className="farm-boundary-builder">
          <div className="farm-boundary-grid" role="grid" aria-label="Boundary sketch grid">
            {Array.from({ length: 16 }, (_, index) => {
              const row = Math.floor(index / 4);
              const col = index % 4;
              const id = `${row}-${col}`;
              const active = selectedCells.includes(id);

              return (
                <button
                  aria-pressed={active}
                  className={`farm-boundary-cell${active ? " is-active" : ""}`}
                  key={id}
                  onClick={() =>
                    setSelectedCells((current) =>
                      active ? current.filter((value) => value !== id) : [...current, id],
                    )
                  }
                  type="button"
                />
              );
            })}
          </div>
          <div className="farm-boundary-copy">
            <strong>Tap the grid to sketch the field footprint.</strong>
            <span>Touch-friendly for mobile. The selected footprint becomes the parcel boundary saved with the field.</span>
          </div>
        </div>
      ) : (
        <div className="farm-manual-note">
          Manual mode keeps the workflow moving when a boundary has not been captured yet. A compact rectangular boundary will be generated until the full geospatial editor is connected.
        </div>
      )}

      <div className="farm-form-grid">
        <label className="farm-form-field">
          <span>Field name</span>
          <Input onChange={(event) => setName(event.target.value)} required value={name} />
        </label>
        <label className="farm-form-field">
          <span>District</span>
          <Input onChange={(event) => setDistrict(event.target.value)} value={district} />
        </label>
        <label className="farm-form-field">
          <span>Area (ha)</span>
          <Input min="0.1" onChange={(event) => setAreaHectares(event.target.value)} step="0.1" type="number" value={areaHectares} />
        </label>
        <label className="farm-form-field">
          <span>Current crop</span>
          <Input onChange={(event) => setCurrentCrop(event.target.value)} value={currentCrop} />
        </label>
        <label className="farm-form-field">
          <span>Variety</span>
          <Input onChange={(event) => setVariety(event.target.value)} value={variety} />
        </label>
        <label className="farm-form-field">
          <span>Soil type</span>
          <Select onChange={(event) => setSoilType(event.target.value)} options={soilOptions} value={soilType} />
        </label>
        <label className="farm-form-field">
          <span>Irrigation</span>
          <Select onChange={(event) => setIrrigationType(event.target.value)} options={irrigationOptions} value={irrigationType} />
        </label>
        <label className="farm-form-field">
          <span>Planting date</span>
          <Input onChange={(event) => setPlantingDate(event.target.value)} type="date" value={plantingDate} />
        </label>
        <label className="farm-form-field">
          <span>Expected harvest</span>
          <Input onChange={(event) => setExpectedHarvestDate(event.target.value)} type="date" value={expectedHarvestDate} />
        </label>
      </div>

      <div className="farm-form-actions">
        <Button onClick={onCancel} type="button" variant="ghost">
          Cancel
        </Button>
        <Button loading={submitting} type="submit">
          Save field
        </Button>
      </div>
    </form>
  );
}

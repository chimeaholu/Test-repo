"use client";

import React from "react";

export interface CropDiagnosisState {
  confidence?: "high" | "low" | "medium";
  fileName: string;
  issue?: string;
  recommendation?: string;
  sources: string[];
  status: "analyzing" | "error" | "ready";
  summary?: string;
}

interface CropDiagnosisProps {
  diagnosis: CropDiagnosisState | null;
  onDismiss: () => void;
}

function confidenceLabel(confidence: CropDiagnosisState["confidence"]): string {
  if (confidence === "high") return "High";
  if (confidence === "medium") return "Medium";
  if (confidence === "low") return "Low";
  return "Pending";
}

export function CropDiagnosis({
  diagnosis,
  onDismiss,
}: CropDiagnosisProps) {
  if (!diagnosis) {
    return null;
  }

  return (
    <section className="agroguide-diagnosis-card" aria-live="polite">
      <div className="agroguide-diagnosis-head">
        <div>
          <strong>Photo diagnosis</strong>
          <p>{diagnosis.fileName}</p>
        </div>
        <button className="agroguide-inline-link" onClick={onDismiss} type="button">
          Dismiss
        </button>
      </div>

      {diagnosis.status === "analyzing" ? (
        <div className="agroguide-diagnosis-body">
          <div className="agroguide-diagnosis-spinner" aria-hidden="true" />
          <div>
            <strong>Analyzing image...</strong>
            <p>AgroGuide is routing the diagnosis request through the advisory workflow.</p>
          </div>
        </div>
      ) : null}

      {diagnosis.status === "ready" ? (
        <div className="agroguide-diagnosis-stack">
          {diagnosis.issue ? <strong>{diagnosis.issue}</strong> : null}
          {diagnosis.summary ? <p>{diagnosis.summary}</p> : null}
          {diagnosis.recommendation ? (
            <p className="agroguide-diagnosis-note">{diagnosis.recommendation}</p>
          ) : null}
          <div className="agroguide-diagnosis-meta">
            <span className={`agroguide-confidence agroguide-confidence-${diagnosis.confidence ?? "medium"}`}>
              {confidenceLabel(diagnosis.confidence)}
            </span>
            {diagnosis.sources.length ? <span>Sources: {diagnosis.sources.join(", ")}</span> : null}
          </div>
        </div>
      ) : null}

      {diagnosis.status === "error" ? (
        <div className="agroguide-diagnosis-stack">
          <strong>Diagnosis unavailable</strong>
          <p>{diagnosis.summary ?? "Sorry, I couldn't process that. Please try again."}</p>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import React from "react";

import { AdvisoryIcon } from "@/components/icons";

interface AgroGuideFloatingButtonProps {
  hasSuggestions: boolean;
  onClick: () => void;
}

export function AgroGuideFloatingButton({
  hasSuggestions,
  onClick,
}: AgroGuideFloatingButtonProps) {
  return (
    <button
      aria-label="Open AgroGuide AI assistant"
      className={`agroguide-fab${hasSuggestions ? " agroguide-fab-pulse" : ""}`}
      onClick={onClick}
      type="button"
    >
      <span className="agroguide-fab-glow" aria-hidden="true" />
      <span className="agroguide-fab-icon" aria-hidden="true">
        <AdvisoryIcon size={26} />
      </span>
    </button>
  );
}

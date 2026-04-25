"use client";

import type { ActorRole } from "@agrodomain/contracts";
import React from "react";

export type AgroGuideSuggestionAction = "diagnosis" | "focus" | "prompt";

export interface AgroGuideSuggestion {
  action: AgroGuideSuggestionAction;
  icon: string;
  id: string;
  label: string;
  prompt?: string;
}

const FARM_SUGGESTIONS: AgroGuideSuggestion[] = [
  {
    action: "diagnosis",
    icon: "🔬",
    id: "farm-diagnosis",
    label: "Crop health advice",
  },
  {
    action: "prompt",
    icon: "🌾",
    id: "farm-feed",
    label: "Fertilizer schedule",
    prompt:
      "Review my current farm context and tell me the next fertilizer or field action I should schedule this week.",
  },
  {
    action: "prompt",
    icon: "🐛",
    id: "farm-pests",
    label: "Pest identification",
    prompt:
      "List the most likely pest issues for this field stage and tell me the safest next inspection steps before treatment.",
  },
  {
    action: "prompt",
    icon: "🌦",
    id: "farm-weather",
    label: "Check weather for this field",
    prompt:
      "Explain the latest weather risk for this field and tell me what action I should take before the next rain window.",
  },
  {
    action: "focus",
    icon: "❓",
    id: "farm-anything",
    label: "Ask anything",
  },
];

const MARKET_SUGGESTIONS: AgroGuideSuggestion[] = [
  {
    action: "prompt",
    icon: "💰",
    id: "market-prices",
    label: "Current market prices",
    prompt:
      "Show the current market prices relevant to my active crops and explain whether I should hold, sell, or negotiate today.",
  },
  {
    action: "prompt",
    icon: "📈",
    id: "market-sell",
    label: "Best time to sell",
    prompt:
      "Based on current demand and price movement, what is the best time for me to sell or relist my produce?",
  },
  {
    action: "prompt",
    icon: "🧪",
    id: "market-quality",
    label: "Quality grading tips",
    prompt:
      "Give me quality grading tips that will help this listing command a better price with buyers right now.",
  },
  {
    action: "prompt",
    icon: "🛍",
    id: "market-listing",
    label: "Help me create a listing",
    prompt:
      "Help me create a stronger marketplace listing with the right title, quantity details, and pricing posture.",
  },
  {
    action: "focus",
    icon: "❓",
    id: "market-anything",
    label: "Ask anything",
  },
];

const WEATHER_SUGGESTIONS: AgroGuideSuggestion[] = [
  {
    action: "prompt",
    icon: "🌦",
    id: "weather-forecast",
    label: "Explain forecast",
    prompt:
      "Explain today's forecast in practical farming terms and tell me which activities I should move forward or delay.",
  },
  {
    action: "prompt",
    icon: "🗓",
    id: "weather-calendar",
    label: "Farming calendar",
    prompt:
      "Convert the latest forecast into a short farming calendar for the next seven days with planting, spraying, and harvest guidance.",
  },
  {
    action: "prompt",
    icon: "💧",
    id: "weather-irrigation",
    label: "Irrigation advice",
    prompt:
      "Tell me whether I should irrigate now, wait for rainfall, or protect against runoff based on the latest weather pattern.",
  },
  {
    action: "prompt",
    icon: "🌱",
    id: "weather-field",
    label: "Check weather for my farm",
    prompt:
      "Check the latest weather for my farm and recommend the safest next action for my crops.",
  },
  {
    action: "focus",
    icon: "❓",
    id: "weather-anything",
    label: "Ask anything",
  },
];

const WALLET_SUGGESTIONS: AgroGuideSuggestion[] = [
  {
    action: "prompt",
    icon: "🔐",
    id: "wallet-escrow",
    label: "Explain this escrow",
    prompt:
      "Explain this escrow status in plain language and tell me what has to happen before settlement can be released.",
  },
  {
    action: "prompt",
    icon: "💸",
    id: "wallet-release",
    label: "Release settlement",
    prompt:
      "Tell me the next safe steps to release settlement or resolve a blocked payment without creating reconciliation risk.",
  },
  {
    action: "prompt",
    icon: "📒",
    id: "wallet-ledger",
    label: "Review ledger activity",
    prompt:
      "Summarize the latest wallet and escrow activity and flag anything that needs attention before payout.",
  },
  {
    action: "prompt",
    icon: "🌦",
    id: "wallet-weather",
    label: "Weather-linked risk",
    prompt:
      "Explain whether weather or delivery delays could affect this settlement and what I should watch next.",
  },
  {
    action: "focus",
    icon: "❓",
    id: "wallet-anything",
    label: "Ask anything",
  },
];

function roleFallback(role: ActorRole): AgroGuideSuggestion[] {
  if (role === "buyer") {
    return [
      {
        action: "prompt",
        icon: "🛍",
        id: "buyer-listing",
        label: "Find better supply",
        prompt:
          "Help me identify the best current supply opportunities and what quality signals I should verify before placing an offer.",
      },
      {
        action: "prompt",
        icon: "💰",
        id: "buyer-price",
        label: "Price negotiation",
        prompt:
          "Give me a negotiation posture for current listings and explain what price band is reasonable today.",
      },
      {
        action: "prompt",
        icon: "🚚",
        id: "buyer-logistics",
        label: "Plan delivery",
        prompt:
          "Explain the next logistics checks I should make before confirming a delivery or settlement release.",
      },
      {
        action: "prompt",
        icon: "🌦",
        id: "buyer-weather",
        label: "Weather impact",
        prompt:
          "Explain whether current weather patterns could affect supply timing, quality, or transport for my active trades.",
      },
      {
        action: "focus",
        icon: "❓",
        id: "buyer-anything",
        label: "Ask anything",
      },
    ];
  }

  return [
    {
      action: "diagnosis",
      icon: "🔬",
      id: "default-diagnosis",
      label: "Diagnose crop",
    },
    {
      action: "prompt",
      icon: "💰",
      id: "default-price",
      label: "Price check",
      prompt:
        "What are the current commodity prices in my area and what should I monitor before I sell or negotiate?",
    },
    {
      action: "prompt",
      icon: "🌦",
      id: "default-weather",
      label: "Weather",
      prompt:
        "What is the weather outlook for my farm and what action should I take today based on that forecast?",
    },
    {
      action: "prompt",
      icon: "🌾",
      id: "default-fields",
      label: "My fields",
      prompt:
        "Give me a concise status update on all my fields, including any urgent agronomy, weather, or market risks.",
    },
    {
      action: "focus",
      icon: "❓",
      id: "default-anything",
      label: "Ask anything",
    },
  ];
}

export function buildContextualSuggestions(
  pathname: string,
  role: ActorRole,
): AgroGuideSuggestion[] {
  if (pathname.startsWith("/app/farm")) {
    return FARM_SUGGESTIONS;
  }

  if (pathname.startsWith("/app/market")) {
    return MARKET_SUGGESTIONS;
  }

  if (pathname.startsWith("/app/weather") || pathname.startsWith("/app/climate")) {
    return WEATHER_SUGGESTIONS;
  }

  if (pathname.startsWith("/app/payments") || pathname.startsWith("/app/finance")) {
    return WALLET_SUGGESTIONS;
  }

  return roleFallback(role);
}

interface ContextualSuggestionsProps {
  onSelect: (suggestion: AgroGuideSuggestion) => void;
  suggestions: AgroGuideSuggestion[];
}

export function ContextualSuggestions({
  onSelect,
  suggestions,
}: ContextualSuggestionsProps) {
  return (
    <div className="agroguide-chip-row" aria-label="AgroGuide quick actions">
      {suggestions.map((suggestion) => (
        <button
          className="agroguide-chip"
          key={suggestion.id}
          onClick={() => onSelect(suggestion)}
          type="button"
        >
          <span aria-hidden="true" className="agroguide-chip-icon">
            {suggestion.icon}
          </span>
          <span>{suggestion.label}</span>
        </button>
      ))}
    </div>
  );
}

"use client";

import React from "react";

export type WalletPaymentMethod =
  | "mtn_momo"
  | "vodafone_cash"
  | "airteltigo_money"
  | "bank_transfer";

type PaymentMethodOption = {
  description: string;
  helper: string;
  id: WalletPaymentMethod;
  label: string;
  tone: "brand" | "accent" | "neutral";
};

function optionsForCountry(countryCode: string): PaymentMethodOption[] {
  if (countryCode === "NG") {
    return [
      {
        id: "mtn_momo",
        label: "MTN MoMo",
        description: "Instant wallet top-up from MTN mobile money",
        helper: "Use the line already linked to your mobile wallet.",
        tone: "brand",
      },
      {
        id: "airteltigo_money",
        label: "Airtel Money",
        description: "Airtel wallet collection flow",
        helper: "Best for smaller top-ups while in the field.",
        tone: "accent",
      },
      {
        id: "bank_transfer",
        label: "Bank Transfer",
        description: "Manual transfer with reference verification",
        helper: "Ideal for higher-value deposits and reconciled transfers.",
        tone: "neutral",
      },
    ];
  }

  if (countryCode === "JM") {
    return [
      {
        id: "bank_transfer",
        label: "Bank Transfer",
        description: "Manual transfer into your Agrodomain wallet",
        helper: "Reference verification keeps the wallet entry auditable.",
        tone: "neutral",
      },
    ];
  }

  return [
    {
      id: "mtn_momo",
      label: "MTN Mobile Money",
      description: "Fast wallet credit from your MTN MoMo line",
      helper: "Best for same-day balance top-ups.",
      tone: "brand",
    },
    {
      id: "vodafone_cash",
      label: "Vodafone Cash",
      description: "Use your Vodafone Cash number for funding",
      helper: "Works well for operator-assisted transfers.",
      tone: "accent",
    },
    {
      id: "airteltigo_money",
      label: "AirtelTigo Money",
      description: "Field-friendly transfer flow for AirtelTigo users",
      helper: "Recommended when coverage is uneven.",
      tone: "neutral",
    },
    {
      id: "bank_transfer",
      label: "Bank Transfer",
      description: "Manual transfer with reference verification",
      helper: "Use this for larger deposits or branch-assisted transfers.",
      tone: "neutral",
    },
  ];
}

export function paymentMethodOptions(countryCode: string): PaymentMethodOption[] {
  return optionsForCountry(countryCode.toUpperCase());
}

export function PaymentMethodSelector(props: {
  countryCode: string;
  onSelect: (method: WalletPaymentMethod) => void;
  selectedMethod: WalletPaymentMethod;
}) {
  const options = paymentMethodOptions(props.countryCode);

  return (
    <div className="wallet-option-grid" role="radiogroup" aria-label="Choose how to add funds">
      {options.map((option) => {
        const isSelected = props.selectedMethod === option.id;
        return (
          <button
            aria-checked={isSelected}
            className={`wallet-option-card ${isSelected ? "wallet-option-card-active" : ""} wallet-option-card-${option.tone}`}
            key={option.id}
            onClick={() => props.onSelect(option.id)}
            role="radio"
            type="button"
          >
            <strong>{option.label}</strong>
            <p>{option.description}</p>
            <span>{option.helper}</span>
          </button>
        );
      })}
    </div>
  );
}

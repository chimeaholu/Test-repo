"use client";

import React from "react";

export function mobileMoneyPlaceholder(countryCode: string): string {
  switch (countryCode.toUpperCase()) {
    case "NG":
      return "0801 234 5678";
    case "JM":
      return "876 555 0100";
    default:
      return "024 123 4567";
  }
}

export function MobileMoneyForm(props: {
  countryCode: string;
  onPhoneChange: (value: string) => void;
  phone: string;
  providerLabel: string;
}) {
  return (
    <div className="field">
      <label htmlFor="wallet-mobile-number">{props.providerLabel} number</label>
      <input
        autoComplete="tel"
        id="wallet-mobile-number"
        inputMode="tel"
        onChange={(event) => props.onPhoneChange(event.target.value)}
        placeholder={mobileMoneyPlaceholder(props.countryCode)}
        value={props.phone}
      />
      <p className="field-help">We use the number only to create the funding reference and confirmation step.</p>
    </div>
  );
}

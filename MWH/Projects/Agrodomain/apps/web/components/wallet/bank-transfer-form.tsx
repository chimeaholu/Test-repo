"use client";

import React from "react";

type BankTransferDetails = {
  accountName: string;
  accountNumber: string;
  bankName: string;
  branch: string;
};

function bankDetails(countryCode: string): BankTransferDetails {
  switch (countryCode.toUpperCase()) {
    case "NG":
      return {
        bankName: "Access Bank",
        branch: "Victoria Island Treasury",
        accountName: "Agrodomain Wallet Collections",
        accountNumber: "0112450987",
      };
    case "JM":
      return {
        bankName: "National Commercial Bank",
        branch: "Kingston Main",
        accountName: "Agrodomain Wallet Collections",
        accountNumber: "2001940876",
      };
    default:
      return {
        bankName: "Ecobank Ghana",
        branch: "Airport City",
        accountName: "Agrodomain Wallet Collections",
        accountNumber: "4129018835010",
      };
  }
}

export function BankTransferForm(props: {
  countryCode: string;
  onReferenceChange: (value: string) => void;
  reference: string;
}) {
  const details = bankDetails(props.countryCode);

  return (
    <div className="content-stack">
      <div className="wallet-bank-panel">
        <strong>{details.bankName}</strong>
        <p className="muted">{details.branch}</p>
        <div className="wallet-bank-grid">
          <article>
            <span>Account name</span>
            <strong>{details.accountName}</strong>
          </article>
          <article>
            <span>Account number</span>
            <strong>{details.accountNumber}</strong>
          </article>
        </div>
      </div>

      <div className="field">
        <label htmlFor="wallet-bank-reference">Transfer reference</label>
        <input
          id="wallet-bank-reference"
          onChange={(event) => props.onReferenceChange(event.target.value)}
          placeholder="AGRO-REF-2048"
          value={props.reference}
        />
        <p className="field-help">Enter the bank transfer reference after you complete the deposit.</p>
      </div>
    </div>
  );
}

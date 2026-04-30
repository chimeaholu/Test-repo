"use client";

import React from "react";

import { InfoList } from "@/components/ui-primitives";
import { formatMoney } from "@/features/wallet/model";
import type { ActorSearchItem } from "@/lib/api/identity";

export function TransferConfirm(props: {
  amount: number;
  currency: string;
  feeAmount: number;
  note: string;
  recipient: ActorSearchItem;
  senderLabel: string;
}) {
  return (
    <InfoList
      items={[
        { label: "Sender", value: props.senderLabel },
        { label: "Recipient", value: `${props.recipient.display_name} (${props.recipient.email})` },
        { label: "Amount", value: formatMoney(props.amount, props.currency) },
        { label: "Fee", value: formatMoney(props.feeAmount, props.currency) },
        { label: "Reference", value: props.note || "No reference added" },
      ]}
    />
  );
}

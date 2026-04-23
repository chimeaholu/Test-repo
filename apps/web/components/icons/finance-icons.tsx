import React from "react";
import { Wallet, ShieldCheck, PiggyBank, Send, Download, Landmark, CreditCard } from "lucide-react";
import type { IconProps } from "./crop-icons";

export function WalletIcon(props: IconProps) {
  return <Wallet size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function EscrowIcon(props: IconProps) {
  return <ShieldCheck size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function FundIcon(props: IconProps) {
  return <PiggyBank size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function SendIcon(props: IconProps) {
  return <Send size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function ReceiveIcon(props: IconProps) {
  return <Download size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

/** Mobile Money -- custom icon: phone with currency symbol */
export function MobileMoneyIcon(props: IconProps) {
  const s = props.size ?? 24;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={props.color ?? "currentColor"} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={props.className} aria-hidden>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <rect x="8" y="5" width="8" height="11" rx="1" />
      <line x1="10" y1="19" x2="14" y2="19" />
      <path d="M12 7v7" />
      <path d="M10 9c0-1 .9-1.5 2-1.5s2 .5 2 1.5-.9 1.5-2 1.5-2 .5-2 1.5.9 1.5 2 1.5 2-.5 2-1.5" />
    </svg>
  );
}

export function BankIcon(props: IconProps) {
  return <Landmark size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function CreditIcon(props: IconProps) {
  return <CreditCard size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

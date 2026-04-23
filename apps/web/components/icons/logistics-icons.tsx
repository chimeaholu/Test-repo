import React from "react";
import { Truck, Route, PackageCheck, Warehouse, Scale } from "lucide-react";
import type { IconProps } from "./crop-icons";

export function TruckIcon(props: IconProps) {
  return <Truck size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function RouteIcon(props: IconProps) {
  return <Route size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function DeliveryIcon(props: IconProps) {
  return <PackageCheck size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function WarehouseIcon(props: IconProps) {
  return <Warehouse size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function ScaleIcon(props: IconProps) {
  return <Scale size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

/** Loading dock / goods being loaded */
export function LoadingIcon(props: IconProps) {
  const s = props.size ?? 24;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={props.color ?? "currentColor"} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={props.className} aria-hidden>
      <rect x="2" y="14" width="20" height="4" rx="1" />
      <rect x="4" y="8" width="5" height="6" rx="0.5" />
      <line x1="6.5" y1="8" x2="6.5" y2="14" />
      <rect x="11" y="10" width="4" height="4" rx="0.5" />
      <path d="M18 12V6" />
      <path d="M15.5 8.5L18 6l2.5 2.5" />
      <circle cx="6" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  );
}

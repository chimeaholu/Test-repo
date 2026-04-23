import React from "react";
import {
  Tractor,
  Layers,
  Droplets,
  Shovel,
  Sprout,
  FlaskConical,
  Home,
  Container,
} from "lucide-react";
import type { IconProps } from "./crop-icons";

export function TractorIcon(props: IconProps) {
  return <Tractor size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function FieldIcon(props: IconProps) {
  return <Layers size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function IrrigationIcon(props: IconProps) {
  return <Droplets size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function SoilIcon(props: IconProps) {
  return <Shovel size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

/** Harvest basket -- custom SVG */
export function HarvestIcon(props: IconProps) {
  const s = props.size ?? 24;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={props.color ?? "currentColor"} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={props.className} aria-hidden>
      <path d="M4 10h16l-2 10H6L4 10z" />
      <path d="M8 10c0-4 2-6 4-6s4 2 4 6" />
      <circle cx="10" cy="14" r="1.5" />
      <circle cx="14" cy="14" r="1.5" />
      <circle cx="12" cy="12" r="1.2" />
    </svg>
  );
}

export function SeedIcon(props: IconProps) {
  return <Sprout size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function FertilizerIcon(props: IconProps) {
  return <FlaskConical size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function GreenhouseIcon(props: IconProps) {
  return <Home size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function SiloIcon(props: IconProps) {
  return <Container size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

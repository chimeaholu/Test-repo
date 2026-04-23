import React from "react";
import { Sun, CloudRain, CloudLightning, Cloud, Thermometer, Droplet, Wind } from "lucide-react";
import type { IconProps } from "./crop-icons";

export function SunIcon(props: IconProps) {
  return <Sun size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function RainIcon(props: IconProps) {
  return <CloudRain size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function StormIcon(props: IconProps) {
  return <CloudLightning size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function CloudIcon(props: IconProps) {
  return <Cloud size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function TemperatureIcon(props: IconProps) {
  return <Thermometer size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function HumidityIcon(props: IconProps) {
  return <Droplet size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function WindIcon(props: IconProps) {
  return <Wind size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

/** Drought -- cracked earth with sun */
export function DroughtIcon(props: IconProps) {
  const s = props.size ?? 24;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={props.color ?? "currentColor"} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={props.className} aria-hidden>
      <circle cx="17" cy="6" r="3" />
      <line x1="17" y1="1" x2="17" y2="2" />
      <line x1="21" y1="6" x2="22" y2="6" />
      <line x1="20" y1="3" x2="20.7" y2="2.3" />
      <line x1="20" y1="9" x2="20.7" y2="9.7" />
      <line x1="2" y1="16" x2="22" y2="16" />
      <path d="M8 16v4l2-2 2 2v-4" />
      <path d="M14 16v3l1.5-1.5L17 19v-3" />
      <path d="M4 16v3l1-1.5L6 19v-3" />
      <path d="M6 16v-3c0-1 .5-2 1.5-2.5" />
      <path d="M6 13c-1-.5-2-1.5-1.5-3" />
    </svg>
  );
}

/** Flood -- water waves over ground */
export function FloodIcon(props: IconProps) {
  const s = props.size ?? 24;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={props.color ?? "currentColor"} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={props.className} aria-hidden>
      <line x1="8" y1="2" x2="7" y2="5" />
      <line x1="12" y1="1" x2="11" y2="4" />
      <line x1="16" y1="2" x2="15" y2="5" />
      <path d="M2 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M2 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M10 8v2" />
      <path d="M14 7v3" />
      <path d="M9 8h6" />
    </svg>
  );
}

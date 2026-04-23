import React from "react";
import { LayoutDashboard, BarChart3, Bell, Settings, User, Store, Shield, BookOpen } from "lucide-react";
import type { IconProps } from "./crop-icons";

export function DashboardIcon(props: IconProps) {
  return <LayoutDashboard size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function AnalyticsIcon(props: IconProps) {
  return <BarChart3 size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function NotificationIcon(props: IconProps) {
  return <Bell size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function SettingsIcon(props: IconProps) {
  return <Settings size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function ProfileIcon(props: IconProps) {
  return <User size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function MarketplaceIcon(props: IconProps) {
  return <Store size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function InsuranceIcon(props: IconProps) {
  return <Shield size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

export function AdvisoryIcon(props: IconProps) {
  return <BookOpen size={props.size ?? 24} color={props.color ?? "currentColor"} className={props.className} aria-hidden />;
}

import type { ReactNode } from "react";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface UserCardProps {
  name: string;
  avatarSrc?: string;
  role?: string;
  action?: ReactNode;
  className?: string;
}

export function UserCard({ name, avatarSrc, role, action, className }: UserCardProps) {
  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <Avatar name={name} src={avatarSrc} size="md" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)", color: "var(--color-neutral-900)" }}>
          {name}
        </div>
        {role && <Badge variant="brand">{role}</Badge>}
      </div>
      {action}
    </div>
  );
}

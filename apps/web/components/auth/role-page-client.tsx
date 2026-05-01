"use client";

import type { ActorRole } from "@agrodomain/contracts";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { FarmerDashboard } from "@/components/dashboards/farmer-dashboard";
import { AdminDashboard } from "@/components/dashboards/admin-dashboard";
import { RoleHome } from "@/components/role-home";
import { useAppState } from "@/components/app-provider";
import { homeRouteForRole } from "@/features/shell/model";

export function RolePageClient({ role }: { role: ActorRole }) {
  const router = useRouter();
  const { isHydrated, session } = useAppState();

  useEffect(() => {
    if (!isHydrated || !session) {
      return;
    }
    if (session.actor.role !== role) {
      router.replace(homeRouteForRole(session.actor.role));
    }
  }, [isHydrated, role, router, session]);

  if (!isHydrated || !session) {
    return null;
  }

  if (session.actor.role !== role) {
    return null;
  }

  if (role === "farmer") {
    return <FarmerDashboard />;
  }
  if (role === "admin") {
    return <AdminDashboard />;
  }

  return <RoleHome />;
}

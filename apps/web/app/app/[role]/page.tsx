import { notFound } from "next/navigation";

import { FarmerDashboard } from "@/components/dashboards/farmer-dashboard";
import { RoleHome } from "@/components/role-home";
import { isAppRole } from "@/features/shell/model";

export default async function RolePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!isAppRole(role)) {
    notFound();
  }

  if (role === "farmer") {
    return <FarmerDashboard />;
  }

  return <RoleHome />;
}

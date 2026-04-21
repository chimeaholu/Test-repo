import { notFound } from "next/navigation";

import { AdminAnalyticsWorkspace } from "@/features/admin/admin-analytics-workspace";
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

  if (role === "admin") {
    return <AdminAnalyticsWorkspace />;
  }

  return <RoleHome />;
}

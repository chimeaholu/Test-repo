import { notFound } from "next/navigation";

import { RolePageClient } from "@/components/auth/role-page-client";
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

  return <RolePageClient role={role} />;
}

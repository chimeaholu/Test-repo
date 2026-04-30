import { AgroIntelligenceEntityDetailPage } from "@/features/agro-intelligence/entity-detail-page";

export default async function AgroIntelligenceGraphDetailRoute({
  params,
}: {
  params: Promise<{ entityId: string }>;
}) {
  const { entityId } = await params;
  return <AgroIntelligenceEntityDetailPage entityId={entityId} mode="graph" />;
}

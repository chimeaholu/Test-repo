import { AgroIntelligenceEntityDetailPage } from "@/features/agro-intelligence/entity-detail-page";

export default async function AgroIntelligenceBuyerProfileRoute({
  params,
}: {
  params: Promise<{ buyerId: string }>;
}) {
  const { buyerId } = await params;
  return <AgroIntelligenceEntityDetailPage entityId={buyerId} mode="buyer-profile" />;
}

import { ConsignmentTimelineClient } from "@/features/traceability/consignment-timeline";

type TraceabilityPageProps = {
  params: Promise<{ consignmentId: string }>;
};

export default async function TraceabilityDetailPage({ params }: TraceabilityPageProps) {
  const { consignmentId } = await params;
  return <ConsignmentTimelineClient consignmentId={consignmentId} />;
}

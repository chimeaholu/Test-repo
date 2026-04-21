import { TraceabilityWorkspace } from "@/features/traceability/traceability-workspace";

type TraceabilityPageProps = {
  params: Promise<{ consignmentId: string }>;
};

export default async function TraceabilityDetailPage({ params }: TraceabilityPageProps) {
  const { consignmentId } = await params;
  return <TraceabilityWorkspace consignmentId={consignmentId} />;
}

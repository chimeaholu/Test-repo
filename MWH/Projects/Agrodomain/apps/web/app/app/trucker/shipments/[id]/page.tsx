import { ShipmentTracking } from "@/features/trucker/shipment-tracking";

type ShipmentTrackingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShipmentTrackingPage({ params }: ShipmentTrackingPageProps) {
  const { id } = await params;
  return <ShipmentTracking shipmentId={id} />;
}

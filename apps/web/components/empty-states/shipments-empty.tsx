import { EmptyState } from "@/components/ui/empty-state";
import { TruckIcon } from "@/components/icons";

export function ShipmentsEmpty() {
  return (
    <EmptyState
      icon={<TruckIcon size={48} />}
      title="No active shipments"
      description="When you arrange delivery for a marketplace order, your shipments and tracking details will appear here."
    />
  );
}

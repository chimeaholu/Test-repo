import { EmptyState } from "@/components/ui/empty-state";
import { SunIcon } from "@/components/icons";

export function AlertsEmpty() {
  return (
    <EmptyState
      icon={<SunIcon size={48} />}
      title="All clear — no weather alerts"
      description="When weather conditions change for your region, alerts will appear here so you can protect your crops."
    />
  );
}

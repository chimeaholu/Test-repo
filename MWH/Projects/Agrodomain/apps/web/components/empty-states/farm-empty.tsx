import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { FieldIcon } from "@/components/icons";

export function FarmEmpty() {
  return (
    <EmptyState
      icon={<FieldIcon size={48} />}
      title="Map your first field"
      description="Add your farm fields to track crops, get weather alerts, and access advisory services tailored to your land."
      action={<Button href="/app/farm">Open AgroFarm</Button>}
    />
  );
}

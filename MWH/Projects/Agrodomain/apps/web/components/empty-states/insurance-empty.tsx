import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { InsuranceIcon } from "@/components/icons";

export function InsuranceEmpty() {
  return (
    <EmptyState
      icon={<InsuranceIcon size={48} />}
      title="Protect your crops"
      description="Browse insurance plans designed for smallholder farmers. Cover your harvest against weather events and market volatility."
      action={<Button href="/app/insurance">View Coverage</Button>}
    />
  );
}

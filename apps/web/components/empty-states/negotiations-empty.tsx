import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { NegotiationIcon } from "@/components/icons";

export function NegotiationsEmpty() {
  return (
    <EmptyState
      icon={<NegotiationIcon size={48} />}
      title="Start your first trade conversation"
      description="Browse marketplace listings and send offers to sellers. Your active negotiations will appear here."
      action={<Button href="/app/market/listings">Browse Listings</Button>}
    />
  );
}

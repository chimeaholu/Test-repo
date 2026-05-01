import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ListingIcon } from "@/components/icons";

export function MarketplaceEmpty() {
  return (
    <EmptyState
      icon={<ListingIcon size={48} />}
      title="Your first harvest listing is waiting"
      description="List your produce to reach buyers across the marketplace. Set your price, quantity, and delivery terms."
      action={<Button href="/app/market/listings/new">Create Listing</Button>}
    />
  );
}

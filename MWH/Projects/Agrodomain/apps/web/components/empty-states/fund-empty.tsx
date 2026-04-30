import { Button } from "@/components/ui/button";
import { FundIcon } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";

export function FundEmpty() {
  return (
    <EmptyState
      icon={<FundIcon size={48} />}
      title="No fund opportunities are live yet"
      description="As soon as qualified marketplace listings are ready for financing, they will appear here with wallet-aware next steps."
      action={<Button href="/app/market/listings">Browse Marketplace</Button>}
    />
  );
}

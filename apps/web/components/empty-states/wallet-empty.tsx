import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { WalletIcon } from "@/components/icons";

export function WalletEmpty() {
  return (
    <EmptyState
      icon={<WalletIcon size={48} />}
      title="Your wallet is ready for action"
      description="Fund your wallet to start making payments for marketplace purchases, logistics, and insurance."
      action={<Button href="/app/fund">Review Fund Options</Button>}
    />
  );
}

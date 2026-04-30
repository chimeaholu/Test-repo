import { ErrorBoundary } from "@/components/error-boundary";
import { FinanceQueueClient } from "@/features/finance/finance-queue";

export default function FinanceQueuePage() {
  return (
    <ErrorBoundary
      secondaryHref="/app"
      secondaryLabel="Back to dashboard"
      title="The finance queue could not finish loading."
    >
      <FinanceQueueClient />
    </ErrorBoundary>
  );
}

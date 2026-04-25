import { ErrorBoundary } from "@/components/error-boundary";
import { AdminAnalyticsWorkspace } from "@/features/admin/admin-analytics-workspace";

export default function AnalyticsPage() {
  return (
    <ErrorBoundary
      secondaryHref="/app"
      secondaryLabel="Back to dashboard"
      title="Admin analytics could not finish loading."
    >
      <AdminAnalyticsWorkspace />
    </ErrorBoundary>
  );
}

import { ErrorBoundary } from "@/components/error-boundary";
import { AdminAnalyticsWorkspace } from "@/features/admin/admin-analytics-workspace";

export default function AnalyticsPage() {
  return (
    <ErrorBoundary
      secondaryHref="/app/admin"
      secondaryLabel="Back to admin home"
      title="The internal analytics workspace could not finish loading."
    >
      <AdminAnalyticsWorkspace />
    </ErrorBoundary>
  );
}

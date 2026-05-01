import { ErrorBoundary } from "@/components/error-boundary";
import { AnalyticsDashboardClient } from "@/features/analytics/analytics-dashboard";

export default function AnalyticsPage() {
  return (
    <ErrorBoundary
      secondaryHref="/app"
      secondaryLabel="Back to dashboard"
      title="AgroInsights could not finish loading."
    >
      <AnalyticsDashboardClient />
    </ErrorBoundary>
  );
}

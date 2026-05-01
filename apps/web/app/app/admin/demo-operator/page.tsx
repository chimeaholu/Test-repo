import { ErrorBoundary } from "@/components/error-boundary";
import { DemoOperatorWorkspace } from "@/features/admin/demo-operator-workspace";

export default function DemoOperatorPage() {
  return (
    <ErrorBoundary
      secondaryHref="/app/admin"
      secondaryLabel="Return to demo home"
      title="The internal demo controls could not finish loading."
    >
      <DemoOperatorWorkspace />
    </ErrorBoundary>
  );
}

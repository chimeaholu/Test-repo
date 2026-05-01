import { Skeleton, SkeletonLines } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="ds-skeleton-page" aria-label="Loading dashboard">
      {/* Page header */}
      <Skeleton variant="heading" width="40%" />
      <Skeleton variant="text" width="25%" />

      {/* Stat cards row */}
      <div className="ds-metric-grid" style={{ marginTop: "1.5rem" }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="ds-stat-card">
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="heading" width="35%" />
            <Skeleton variant="text" width="60%" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div style={{ marginTop: "1.5rem" }}>
        <Skeleton variant="card" height="240px" />
      </div>

      {/* Recent activity */}
      <div style={{ marginTop: "1.5rem" }}>
        <Skeleton variant="heading" width="30%" />
        <div style={{ marginTop: "0.75rem" }}>
          <SkeletonLines count={5} />
        </div>
      </div>
    </div>
  );
}

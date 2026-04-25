import { Skeleton } from "@/components/ui/skeleton";

export function AlertSkeleton() {
  return (
    <div className="ds-skeleton-page" aria-label="Loading weather alerts">
      {/* Page header */}
      <Skeleton variant="heading" width="35%" />
      <Skeleton variant="text" width="45%" />

      {/* Weather summary card */}
      <div className="ds-card" style={{ padding: "1.5rem", marginTop: "1.5rem" }}>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <Skeleton variant="avatar" width="64px" height="64px" />
          <div style={{ flex: 1 }}>
            <Skeleton variant="heading" width="120px" />
            <Skeleton variant="text" width="200px" />
          </div>
          <div>
            <Skeleton variant="heading" width="60px" height="2.5rem" />
          </div>
        </div>
      </div>

      {/* Alert cards */}
      <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="ds-card" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <Skeleton variant="avatar" width="32px" height="32px" />
              <div style={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="30%" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

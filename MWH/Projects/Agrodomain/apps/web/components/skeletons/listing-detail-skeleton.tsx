import { Skeleton, SkeletonLines } from "@/components/ui/skeleton";

export function ListingDetailSkeleton() {
  return (
    <div className="ds-skeleton-page" aria-label="Loading listing details">
      {/* Breadcrumb */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <Skeleton variant="text" width="60px" />
        <Skeleton variant="text" width="8px" />
        <Skeleton variant="text" width="80px" />
        <Skeleton variant="text" width="8px" />
        <Skeleton variant="text" width="120px" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "2rem", marginTop: "1.5rem" }}>
        {/* Main content */}
        <div>
          {/* Image gallery */}
          <Skeleton variant="card" height="320px" />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} variant="card" width="72px" height="72px" />
            ))}
          </div>

          {/* Description */}
          <div style={{ marginTop: "1.5rem" }}>
            <Skeleton variant="heading" width="55%" />
            <div style={{ marginTop: "0.75rem" }}>
              <SkeletonLines count={4} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Skeleton variant="heading" width="40%" />
          <Skeleton variant="heading" width="30%" height="2rem" />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="row" />
          <div className="ds-card" style={{ padding: "1rem" }}>
            <Skeleton variant="avatar" />
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="text" width="70%" />
          </div>
          <Skeleton variant="row" />
        </div>
      </div>
    </div>
  );
}

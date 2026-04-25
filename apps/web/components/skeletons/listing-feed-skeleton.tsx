import { Skeleton } from "@/components/ui/skeleton";

export function ListingFeedSkeleton() {
  return (
    <div className="ds-skeleton-page" aria-label="Loading listings">
      {/* Search bar */}
      <Skeleton variant="row" width="100%" />

      {/* Filter chips */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} variant="text" width="80px" height="2rem" />
        ))}
      </div>

      {/* Listing cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1rem",
          marginTop: "1.5rem",
        }}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="ds-card">
            <Skeleton variant="card" height="160px" />
            <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <Skeleton variant="heading" width="70%" />
              <Skeleton variant="text" width="50%" />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
                <Skeleton variant="text" width="30%" />
                <Skeleton variant="text" width="25%" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

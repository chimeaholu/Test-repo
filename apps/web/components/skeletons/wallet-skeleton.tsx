import { Skeleton, SkeletonLines } from "@/components/ui/skeleton";

export function WalletSkeleton() {
  return (
    <div className="ds-skeleton-page" aria-label="Loading wallet">
      {/* Balance card */}
      <div className="ds-card ds-card-elevated" style={{ padding: "2rem" }}>
        <Skeleton variant="text" width="100px" />
        <Skeleton variant="heading" width="180px" height="2.5rem" />
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
          <Skeleton variant="text" width="100px" height="2.5rem" />
          <Skeleton variant="text" width="100px" height="2.5rem" />
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} variant="card" width="120px" height="80px" />
        ))}
      </div>

      {/* Transaction history */}
      <div style={{ marginTop: "2rem" }}>
        <Skeleton variant="heading" width="200px" />
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0" }}>
              <Skeleton variant="avatar" width="36px" height="36px" />
              <div style={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="30%" />
              </div>
              <Skeleton variant="text" width="80px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

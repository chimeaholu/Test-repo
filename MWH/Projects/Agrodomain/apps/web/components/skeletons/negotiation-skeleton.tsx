import { Skeleton, SkeletonLines } from "@/components/ui/skeleton";

export function NegotiationSkeleton() {
  return (
    <div className="ds-skeleton-page" aria-label="Loading negotiations">
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1px", height: "calc(100vh - 8rem)" }}>
        {/* Thread list sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "1rem" }}>
          <Skeleton variant="row" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.75rem 0" }}>
              <Skeleton variant="avatar" />
              <div style={{ flex: 1 }}>
                <Skeleton variant="text" width="70%" />
                <Skeleton variant="text" width="90%" />
              </div>
            </div>
          ))}
        </div>

        {/* Chat area */}
        <div style={{ display: "flex", flexDirection: "column", padding: "1rem" }}>
          {/* Header */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", paddingBottom: "1rem" }}>
            <Skeleton variant="avatar" />
            <div>
              <Skeleton variant="text" width="120px" />
              <Skeleton variant="text" width="80px" />
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            <div style={{ maxWidth: "65%", alignSelf: "flex-start" }}>
              <SkeletonLines count={2} />
            </div>
            <div style={{ maxWidth: "55%", alignSelf: "flex-end" }}>
              <Skeleton variant="text" />
            </div>
            <div style={{ maxWidth: "60%", alignSelf: "flex-start" }}>
              <SkeletonLines count={3} />
            </div>
          </div>

          {/* Input */}
          <Skeleton variant="row" height="3rem" />
        </div>
      </div>
    </div>
  );
}

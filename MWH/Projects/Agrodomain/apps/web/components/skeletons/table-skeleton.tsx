import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton() {
  return (
    <div className="ds-skeleton-page" aria-label="Loading table">
      {/* Search + actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton variant="row" width="300px" />
        <Skeleton variant="text" width="100px" height="2.5rem" />
      </div>

      {/* Table */}
      <div className="ds-data-table" style={{ marginTop: "1rem" }}>
        {/* Header row */}
        <div style={{ display: "flex", gap: "1rem", padding: "0.75rem 1rem", borderBottom: "1px solid var(--color-neutral-200)" }}>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} variant="text" width={i === 0 ? "25%" : "15%"} />
          ))}
        </div>

        {/* Data rows */}
        {Array.from({ length: 8 }, (_, row) => (
          <div key={row} style={{ display: "flex", gap: "1rem", padding: "0.75rem 1rem", alignItems: "center" }}>
            {Array.from({ length: 5 }, (_, col) => (
              <Skeleton key={col} variant="text" width={col === 0 ? "25%" : "15%"} />
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
        <Skeleton variant="text" width="80px" />
        <Skeleton variant="text" width="60px" height="2rem" />
      </div>
    </div>
  );
}

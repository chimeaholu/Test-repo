"use client";

import React from "react";
import { use, useEffect, useState } from "react";

import { FarmDetail } from "@/components/fund/farm-detail";
import { InvestFlow } from "@/components/fund/invest-flow";
import { useAppState } from "@/components/app-provider";
import { SurfaceCard } from "@/components/ui-primitives";
import { fundApi } from "@/lib/api/fund";
import { walletApi } from "@/lib/api/wallet";
import { marketplaceApi } from "@/lib/api/marketplace";
import { buildFundOpportunity, type FundInvestmentRecord, type FundOpportunity } from "@/lib/fund";

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  GH: "GHS",
  JM: "JMD",
  NG: "NGN",
};

export default function FundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { session, traceId } = useAppState();
  const [opportunity, setOpportunity] = useState<FundOpportunity | null>(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    const currency = COUNTRY_CURRENCY_MAP[session.actor.country_code] ?? "USD";

    void Promise.all([
      marketplaceApi.getListing(id, traceId),
      walletApi.getWalletSummary(traceId, currency),
      fundApi.listOpportunities(traceId, { q: id }),
    ])
      .then(([listingResponse, walletResponse, opportunityResponse]) => {
        if (cancelled) {
          return;
        }
        const canonicalOpportunity =
          opportunityResponse.data.items.find((item) => item.farm_id === id) ?? null;
        setOpportunity(buildFundOpportunity(listingResponse.data, 0, canonicalOpportunity ?? undefined));
        setAvailableBalance(walletResponse.data.available_balance);
        setError(null);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load this farm opportunity.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, session, traceId]);

  if (!session) {
    return null;
  }

  const currency = COUNTRY_CURRENCY_MAP[session.actor.country_code] ?? "USD";

  return (
    <div className="content-stack">
      {error ? (
        <SurfaceCard>
          <p className="field-error">{error}</p>
        </SurfaceCard>
      ) : null}

      {opportunity ? (
        <>
          <FarmDetail currency={currency} opportunity={opportunity} />
          <InvestFlow
            actorId={session.actor.actor_id}
            availableBalance={availableBalance}
            currency={currency}
            onCompleted={async (record: FundInvestmentRecord) => {
              const [walletResponse, opportunityResponse] = await Promise.all([
                walletApi.getWalletSummary(traceId, currency),
                fundApi.getOpportunity(record.opportunity_id, traceId),
              ]);
              setAvailableBalance(walletResponse.data.available_balance);
              setOpportunity((current) =>
                current
                  ? buildFundOpportunity(current.listing, 0, opportunityResponse.data)
                  : current,
              );
            }}
            opportunity={opportunity}
            traceId={traceId}
          />
        </>
      ) : (
        <SurfaceCard>
          <p className="muted">Loading fund opportunity...</p>
        </SurfaceCard>
      )}
    </div>
  );
}

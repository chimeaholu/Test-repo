import type { ListingRecord } from "@agrodomain/contracts";

import type { EscrowReadModel, WalletBalance, WalletLedgerEntry } from "@/features/wallet/model";
import { formatMoney } from "@/features/wallet/model";

export type FundOpportunityCard = {
  commodity: string;
  expectedReturnLabel: string;
  href: string;
  listingId: string;
  location: string;
  projectedRaise: string;
  progressPct: number;
  statusLabel: string;
  title: string;
};

export type FundInvestmentCard = {
  amountLabel: string;
  escrowId: string;
  href: string;
  listingId: string;
  returnsLabel: string;
  statusLabel: string;
  title: string;
  updatedAtLabel: string;
};

export type FundPortfolioSummary = {
  activeCount: number;
  availableCashLabel: string;
  totalInvestedLabel: string;
  totalReturnsLabel: string;
};

function progressForListing(listing: ListingRecord, index: number): number {
  return Math.min(94, 28 + index * 11 + Math.round(listing.quantity_tons * 3));
}

function targetAmount(listing: ListingRecord): number {
  return Math.max(listing.price_amount * listing.quantity_tons * 1.8, listing.price_amount * 2);
}

export function buildFundOpportunities(listings: ListingRecord[]): FundOpportunityCard[] {
  return listings
    .filter((listing) => listing.status === "published")
    .map((listing, index) => {
      const progressPct = progressForListing(listing, index);
      const projectedAmount = Math.round((targetAmount(listing) * progressPct) / 100);
      return {
        commodity: listing.commodity,
        expectedReturnLabel: `${12 + index * 2}% projected return`,
        href: `/app/market/listings/${listing.listing_id}`,
        listingId: listing.listing_id,
        location: listing.location,
        projectedRaise: `${formatMoney(projectedAmount, listing.price_currency)} of ${formatMoney(
          Math.round(targetAmount(listing)),
          listing.price_currency,
        )}`,
        progressPct,
        statusLabel: progressPct >= 85 ? "Closing soon" : progressPct >= 50 ? "Funding live" : "New opportunity",
        title: listing.title,
      };
    });
}

export function buildFundInvestments(escrows: EscrowReadModel[], transactions: WalletLedgerEntry[]): FundInvestmentCard[] {
  const returnTotal = transactions
    .filter((entry) => entry.direction === "credit")
    .reduce((sum, entry) => sum + entry.amount, 0);

  return escrows
    .filter((escrow) => ["initiated", "partner_pending", "funded", "released"].includes(escrow.state))
    .map((escrow, index) => ({
      amountLabel: formatMoney(escrow.amount, escrow.currency),
      escrowId: escrow.escrow_id,
      href: `/app/payments/wallet?escrow=${escrow.escrow_id}`,
      listingId: escrow.listing_id,
      returnsLabel:
        returnTotal > 0
          ? `${formatMoney(Math.round(returnTotal / Math.max(1, escrows.length)), escrow.currency)} realized`
          : "Returns pending settlement",
      statusLabel: escrow.state.replaceAll("_", " "),
      title: `Portfolio stake for ${escrow.listing_id}`,
      updatedAtLabel: new Date(escrow.updated_at).toLocaleDateString(),
    }));
}

export function buildFundPortfolioSummary(
  balance: WalletBalance | null,
  escrows: EscrowReadModel[],
  transactions: WalletLedgerEntry[],
): FundPortfolioSummary {
  const activeInvestments = escrows.filter((escrow) => ["initiated", "partner_pending", "funded", "released"].includes(escrow.state));
  const totalInvested = activeInvestments.reduce((sum, escrow) => sum + escrow.amount, 0);
  const totalReturns = transactions
    .filter((entry) => entry.direction === "credit")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const currency = balance?.currency ?? activeInvestments[0]?.currency ?? "USD";

  return {
    activeCount: activeInvestments.length,
    availableCashLabel: balance ? formatMoney(balance.available_balance, balance.currency) : formatMoney(0, currency),
    totalInvestedLabel: formatMoney(totalInvested, currency),
    totalReturnsLabel: formatMoney(totalReturns, currency),
  };
}

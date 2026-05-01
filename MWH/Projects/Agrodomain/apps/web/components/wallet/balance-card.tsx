"use client";

import React from "react";
import { ArrowDownToLine, ArrowUpRight, BanknoteArrowDown, Landmark, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { WalletBalance } from "@/features/wallet/model";
import { formatMoney } from "@/features/wallet/model";

type CurrencyOption = {
  label: string;
  value: string;
};

interface BalanceCardProps {
  activeEscrowCount: number;
  balance: WalletBalance | null;
  currencyOptions: CurrencyOption[];
  onCurrencyChange: (currency: string) => void;
  pendingReviewCount: number;
  selectedCurrency: string;
}

export function BalanceCard({
  activeEscrowCount,
  balance,
  currencyOptions,
  onCurrencyChange,
  pendingReviewCount,
  selectedCurrency,
}: BalanceCardProps) {
  const availableLabel = balance ? formatMoney(balance.available_balance, balance.currency) : "Loading";
  const heldLabel = balance ? formatMoney(balance.held_balance, balance.currency) : "Loading";

  return (
    <section className="wallet-balance-card" aria-label="Wallet balance">
      <div className="wallet-balance-backdrop" aria-hidden="true" />
      <div className="wallet-balance-header">
        <div className="wallet-balance-copy">
          <Badge variant="brand" className="wallet-balance-badge">
            <ShieldCheck size={14} />
            Wallet protected by payment-hold controls
          </Badge>
          <p className="wallet-balance-eyebrow">Wallet</p>
          <h2>See your balance, money on hold, and recent payment movement.</h2>
          <p>
            Available cash, payment holds, and the next money movement are visible in one mobile-first view.
          </p>
        </div>

        <label className="wallet-balance-selector" htmlFor="wallet-currency">
          <span>Display currency</span>
          <Select
            id="wallet-currency"
            options={currencyOptions}
            value={selectedCurrency}
            onChange={(event) => onCurrencyChange(event.target.value)}
          />
        </label>
      </div>

      <div className="wallet-balance-main">
        <div className="wallet-balance-total">
          <span>Available balance</span>
          <strong>{availableLabel}</strong>
          <p>{balance?.updated_at ? `Updated ${new Date(balance.updated_at).toLocaleString()}` : "Loading latest balance"}</p>
        </div>

        <div className="wallet-balance-stats" aria-label="Balance split">
          <article>
            <div className="wallet-balance-stat-head">
              <Landmark size={16} />
              <span>Available now</span>
            </div>
            <strong>{availableLabel}</strong>
            <p>Ready for funding, payout, or transfer.</p>
          </article>

          <article>
            <div className="wallet-balance-stat-head">
              <BanknoteArrowDown size={16} />
              <span>Money on hold</span>
            </div>
            <strong>{heldLabel}</strong>
            <p>Protected until the deal reaches its release state.</p>
          </article>
        </div>
      </div>

      <div className="wallet-balance-footer">
        <div className="wallet-quick-actions" aria-label="Wallet quick actions">
          <Button href="/app/payments/wallet?intent=add-funds" size="lg">
            <ArrowDownToLine size={16} />
            Add funds
          </Button>
          <Button href="/app/payments/wallet?intent=send-money" size="lg" variant="secondary">
            <ArrowUpRight size={16} />
            Send money
          </Button>
          <Button href="/app/market/negotiations" size="lg" variant="ghost">
            Review deals
          </Button>
        </div>

        <div className="wallet-trust-strip" aria-label="Wallet status summary">
          <article>
            <span>Active escrows</span>
            <strong>{activeEscrowCount}</strong>
          </article>
          <article>
            <span>Needs review</span>
            <strong>{pendingReviewCount}</strong>
          </article>
        </div>
      </div>
    </section>
  );
}

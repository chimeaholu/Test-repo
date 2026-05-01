"use client";

import React from "react";
import { ArrowRight, ShieldCheck, TrendingUp, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FundHeroProps {
  activeInvestors: number;
  capitalCommitted: string;
  liveOpportunities: number;
  settledPayouts: string;
}

export function FundHero({
  activeInvestors,
  capitalCommitted,
  liveOpportunities,
  settledPayouts,
}: FundHeroProps) {
  return (
    <section className="fund-hero">
      <div className="fund-hero-copy">
        <Badge variant="brand" className="fund-hero-badge">
          <ShieldCheck size={14} />
          Escrow-backed agricultural investing
        </Badge>
        <p className="fund-hero-eyebrow">AgroFund portal</p>
        <h1>Invest in African agriculture with live operating context.</h1>
        <p>
          Review opportunities sourced from active Agrodomain supply, see how much capital is already committed,
          and fund farms with clearer payout and settlement visibility.
        </p>

        <div className="fund-hero-actions">
          <Button href="#fund-opportunities" size="lg">
            Browse opportunities
            <ArrowRight size={16} />
          </Button>
          <Button href="/app/payments/wallet" size="lg" variant="secondary">
            <Wallet size={16} />
            Open wallet
          </Button>
        </div>
      </div>

      <div className="fund-hero-panel">
        <article>
          <span>Live opportunities</span>
          <strong>{liveOpportunities}</strong>
          <p>Listings converted into investable farm opportunities.</p>
        </article>
        <article>
          <span>Capital committed</span>
          <strong>{capitalCommitted}</strong>
          <p>Derived from live escrow activity and current funding progress.</p>
        </article>
        <article>
          <span>Settled payouts</span>
          <strong>{settledPayouts}</strong>
          <p>Completed release events flowing through the wallet ledger.</p>
        </article>
        <article>
          <span>Active investors</span>
          <strong>{activeInvestors}</strong>
          <p>Unique buyers or investors already participating in open deals.</p>
        </article>
      </div>

      <div className="fund-hero-trust">
        <div>
          <TrendingUp size={18} />
          <span>Return expectations stay visible before capital leaves the wallet.</span>
        </div>
        <div>
          <ShieldCheck size={18} />
          <span>Escrow state, payout history, and counterparty movement remain visible after funding.</span>
        </div>
      </div>
    </section>
  );
}

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
          Protection in place
        </Badge>
        <p className="fund-hero-eyebrow">AgroFund</p>
        <h1>Back agricultural opportunities with clearer progress and return visibility</h1>
        <p>
          Compare live opportunities, review funding progress, and invest in farms with more confidence.
        </p>

        <div className="fund-hero-actions">
          <Button href="#fund-opportunities" size="lg">
            Explore opportunities
            <ArrowRight size={16} />
          </Button>
          <Button href="/app/fund/my-investments" size="lg" variant="secondary">
            <Wallet size={16} />
            View my investments
          </Button>
        </div>
      </div>

      <div className="fund-hero-panel">
        <article>
          <span>Featured opportunities</span>
          <strong>{liveOpportunities}</strong>
          <p>Farm opportunities ready to compare right now.</p>
        </article>
        <article>
          <span>Funding progress</span>
          <strong>{capitalCommitted}</strong>
          <p>Capital already committed across active opportunities.</p>
        </article>
        <article>
          <span>Returns paid</span>
          <strong>{settledPayouts}</strong>
          <p>Payouts already returned through the platform.</p>
        </article>
        <article>
          <span>Active investors</span>
          <strong>{activeInvestors}</strong>
          <p>People already backing live farm opportunities.</p>
        </article>
      </div>

      <div className="fund-hero-trust">
        <div>
          <TrendingUp size={18} />
          <span>Expected return stays visible before you invest.</span>
        </div>
        <div>
          <ShieldCheck size={18} />
          <span>Funding progress, payout history, and protection signals stay close after you commit.</span>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import * as React from "react";

import { TrendDownIcon, TrendUpIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type MarketplaceSidebarProps = {
  featuredListings: Array<{
    href: string;
    location: string;
    priceLabel: string;
    title: string;
  }>;
  popularCategories: Array<{
    count: number;
    label: string;
  }>;
  priceTrends: Array<{
    direction: "down" | "flat" | "up";
    label: string;
    points: number[];
    priceLabel: string;
  }>;
};

export function MarketplaceSidebar({
  featuredListings,
  popularCategories,
  priceTrends,
}: MarketplaceSidebarProps) {
  return (
    <aside className="market-sidebar" aria-label="Marketplace insights">
      <Card className="market-sidebar-card">
        <div className="market-sidebar-heading">
          <p>Popular categories</p>
          <strong>Where buyers are looking now</strong>
        </div>
        <div className="market-sidebar-stack">
          {popularCategories.map((category) => (
            <div className="market-sidebar-row" key={category.label}>
              <span>{category.label}</span>
              <Badge variant="neutral">{category.count} lots</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="market-sidebar-card">
        <div className="market-sidebar-heading">
          <p>Price pulse</p>
          <strong>Quick trend read</strong>
        </div>
        <div className="market-sidebar-stack">
          {priceTrends.map((trend) => (
            <div className="market-trend-row" key={trend.label}>
              <div className="market-trend-copy">
                <span>{trend.label}</span>
                <strong>{trend.priceLabel}</strong>
              </div>
              <div className="market-trend-chart">
                <Sparkline points={trend.points} />
                {trend.direction === "down" ? (
                  <TrendDownIcon aria-hidden="true" size={16} />
                ) : (
                  <TrendUpIcon aria-hidden="true" size={16} />
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="market-sidebar-card">
        <div className="market-sidebar-heading">
          <p>Featured listings</p>
          <strong>High-signal supply to inspect</strong>
        </div>
        <div className="market-sidebar-stack">
          {featuredListings.map((listing) => (
            <Link className="market-featured-link" href={listing.href} key={listing.href}>
              <div>
                <strong>{listing.title}</strong>
                <span>{listing.location}</span>
              </div>
              <Badge variant="brand">{listing.priceLabel}</Badge>
            </Link>
          ))}
        </div>
      </Card>
    </aside>
  );
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length === 0) {
    return <svg aria-hidden="true" className="market-sparkline" viewBox="0 0 80 28" />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const path = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 80;
      const y = 24 - ((point - min) / range) * 20;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg aria-hidden="true" className="market-sparkline" viewBox="0 0 80 28">
      <path d={path} />
    </svg>
  );
}

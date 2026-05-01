"use client";

import * as React from "react";
import { SearchIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type SearchFiltersProps = {
  ageWindow: string;
  commodity: string;
  commodityOptions: string[];
  location: string;
  locationOptions: string[];
  onAgeWindowChange: (value: string) => void;
  onCommodityChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  onPriceMinChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onSortChange: (value: string) => void;
  priceMax: string;
  priceMin: string;
  query: string;
  resultCount: number;
  searchSuggestions: string[];
  sort: string;
};

const searchSuggestionId = "marketplace-search-suggestions";

export function SearchFilters({
  ageWindow,
  commodity,
  commodityOptions,
  location,
  locationOptions,
  onAgeWindowChange,
  onCommodityChange,
  onLocationChange,
  onPriceMaxChange,
  onPriceMinChange,
  onQueryChange,
  onSortChange,
  priceMax,
  priceMin,
  query,
  resultCount,
  searchSuggestions,
  sort,
}: SearchFiltersProps) {
  return (
    <section className="market-search-panel" aria-label="Marketplace search and filters">
      <div className="market-search-field">
        <label className="market-filter-label" htmlFor="market-search">
          Search lots
        </label>
        <div className="market-search-input-shell">
          <SearchIcon aria-hidden="true" className="market-search-icon" size={18} />
          <Input
            aria-describedby="market-search-results"
            id="market-search"
            inputSize="lg"
            list={searchSuggestionId}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by commodity or location"
            value={query}
          />
        </div>
        <datalist id={searchSuggestionId}>
          {searchSuggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      </div>

      <div className="market-filter-grid">
        <div className="market-filter-field">
          <label className="market-filter-label" htmlFor="market-commodity-filter">
            Commodity
          </label>
          <Select
            id="market-commodity-filter"
            onChange={(event) => onCommodityChange(event.target.value)}
            options={[
              { label: "All commodities", value: "all" },
              ...commodityOptions.map((option) => ({ label: option, value: option })),
            ]}
            value={commodity}
          />
        </div>

        <div className="market-filter-field">
          <label className="market-filter-label" htmlFor="market-location-filter">
            Location
          </label>
          <Select
            id="market-location-filter"
            onChange={(event) => onLocationChange(event.target.value)}
            options={[
              { label: "All locations", value: "all" },
              ...locationOptions.map((option) => ({ label: option, value: option })),
            ]}
            value={location}
          />
        </div>

        <div className="market-filter-field">
          <label className="market-filter-label" htmlFor="market-price-min">
            Min price
          </label>
          <Input
            id="market-price-min"
            inputMode="decimal"
            min="0"
            onChange={(event) => onPriceMinChange(event.target.value)}
            placeholder="0"
            type="number"
            value={priceMin}
          />
        </div>

        <div className="market-filter-field">
          <label className="market-filter-label" htmlFor="market-price-max">
            Max price
          </label>
          <Input
            id="market-price-max"
            inputMode="decimal"
            min="0"
            onChange={(event) => onPriceMaxChange(event.target.value)}
            placeholder="Any"
            type="number"
            value={priceMax}
          />
        </div>

        <div className="market-filter-field">
          <label className="market-filter-label" htmlFor="market-age-filter">
            Listing age
          </label>
          <Select
            id="market-age-filter"
            onChange={(event) => onAgeWindowChange(event.target.value)}
            options={[
              { label: "Any time", value: "all" },
              { label: "Last 24 hours", value: "1d" },
              { label: "Last 7 days", value: "7d" },
              { label: "Last 30 days", value: "30d" },
            ]}
            value={ageWindow}
          />
        </div>

        <div className="market-filter-field">
          <label className="market-filter-label" htmlFor="market-sort">
            Sort by
          </label>
          <Select
            id="market-sort"
            onChange={(event) => onSortChange(event.target.value)}
            options={[
              { label: "Freshest first", value: "freshest" },
              { label: "Lowest price", value: "price-asc" },
              { label: "Highest price", value: "price-desc" },
              { label: "Largest quantity", value: "quantity-desc" },
            ]}
            value={sort}
          />
        </div>
      </div>

      <p className="market-results-copy" id="market-search-results">
        {resultCount} live lot{resultCount === 1 ? "" : "s"} match your filters.
      </p>
    </section>
  );
}

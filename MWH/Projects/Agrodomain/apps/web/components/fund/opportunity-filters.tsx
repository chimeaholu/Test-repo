"use client";

import React from "react";
import { FilterX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type OpportunitySort = "newest" | "return" | "progress";
export type OpportunityStatus = "all" | "open" | "funded" | "closed";

interface OpportunityFiltersProps {
  cropOptions: string[];
  investmentRange: string;
  onCropChange: (value: string) => void;
  onInvestmentRangeChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onReset: () => void;
  onSortChange: (value: OpportunitySort) => void;
  onStatusChange: (value: OpportunityStatus) => void;
  regionOptions: string[];
  selectedCrop: string;
  selectedRegion: string;
  selectedSort: OpportunitySort;
  selectedStatus: OpportunityStatus;
}

export function OpportunityFilters({
  cropOptions,
  investmentRange,
  onCropChange,
  onInvestmentRangeChange,
  onRegionChange,
  onReset,
  onSortChange,
  onStatusChange,
  regionOptions,
  selectedCrop,
  selectedRegion,
  selectedSort,
  selectedStatus,
}: OpportunityFiltersProps) {
  return (
    <section className="fund-filter-bar" aria-label="AgroFund opportunity filters">
      <label className="fund-filter-field" htmlFor="fund-filter-crop">
        <span>Crop type</span>
        <Select
          id="fund-filter-crop"
          options={[{ label: "All crops", value: "all" }, ...cropOptions.map((item) => ({ label: item, value: item }))]}
          value={selectedCrop}
          onChange={(event) => onCropChange(event.target.value)}
        />
      </label>

      <label className="fund-filter-field" htmlFor="fund-filter-region">
        <span>Region</span>
        <Select
          id="fund-filter-region"
          options={[
            { label: "All regions", value: "all" },
            ...regionOptions.map((item) => ({ label: item, value: item })),
          ]}
          value={selectedRegion}
          onChange={(event) => onRegionChange(event.target.value)}
        />
      </label>

      <label className="fund-filter-field" htmlFor="fund-filter-status">
        <span>Funding status</span>
        <Select
          id="fund-filter-status"
          options={[
            { label: "All", value: "all" },
            { label: "Open", value: "open" },
            { label: "Funded", value: "funded" },
            { label: "Closed", value: "closed" },
          ]}
          value={selectedStatus}
          onChange={(event) => onStatusChange(event.target.value as OpportunityStatus)}
        />
      </label>

      <label className="fund-filter-field" htmlFor="fund-filter-range">
        <span>Investment range</span>
        <Input
          id="fund-filter-range"
          placeholder="e.g. 100-5000"
          value={investmentRange}
          onChange={(event) => onInvestmentRangeChange(event.target.value)}
        />
      </label>

      <label className="fund-filter-field" htmlFor="fund-filter-sort">
        <span>Sort by</span>
        <Select
          id="fund-filter-sort"
          options={[
            { label: "Newest", value: "newest" },
            { label: "Highest return", value: "return" },
            { label: "Funding progress", value: "progress" },
          ]}
          value={selectedSort}
          onChange={(event) => onSortChange(event.target.value as OpportunitySort)}
        />
      </label>

      <div className="fund-filter-actions">
        <Button variant="ghost" onClick={onReset}>
          <FilterX size={16} />
          Reset
        </Button>
      </div>
    </section>
  );
}

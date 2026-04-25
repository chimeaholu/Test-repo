"use client";

import * as React from "react";
import { clsx } from "clsx";

type CategoryNavProps = {
  categories: Array<{
    count: number;
    label: string;
  }>;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
};

export function CategoryNav({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryNavProps) {
  return (
    <nav aria-label="Marketplace categories" className="market-category-nav">
      {categories.map((category) => {
        const selected = category.label === selectedCategory;
        return (
          <button
            key={category.label}
            aria-pressed={selected}
            className={clsx("market-category-pill", selected && "market-category-pill-active")}
            onClick={() => onSelectCategory(category.label)}
            type="button"
          >
            <span>{category.label}</span>
            <strong>{category.count}</strong>
          </button>
        );
      })}
    </nav>
  );
}

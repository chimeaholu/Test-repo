"use client";

import { type ChangeEvent, type ReactNode } from "react";
import { clsx } from "clsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: () => void;
  filters?: ReactNode;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search...", onSearch, filters, className }: SearchBarProps) {
  return (
    <div className={clsx("ds-search-bar", className)}>
      <Input
        type="search"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
      />
      {filters}
      {value && (
        <Button variant="ghost" size="sm" onClick={() => onChange("")}>
          Clear
        </Button>
      )}
    </div>
  );
}

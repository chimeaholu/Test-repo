"use client";

import { Download, Search } from "lucide-react";
import React from "react";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/molecules/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui-primitives";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { WalletLedgerEntry } from "@/features/wallet/model";
import { formatMoney } from "@/features/wallet/model";

type TransactionKind = "all" | "credit" | "debit" | "escrow";

type TransactionRow = {
  amount: string;
  balance: string;
  createdAt: string;
  description: string;
  entryId: string;
  kind: TransactionKind;
  renderedDate: string;
};

function entryKind(entry: WalletLedgerEntry): Exclude<TransactionKind, "all"> {
  if (entry.reason.startsWith("escrow_")) {
    return "escrow";
  }
  return entry.direction === "credit" ? "credit" : "debit";
}

function badgeVariant(kind: Exclude<TransactionKind, "all">) {
  if (kind === "credit") {
    return "success" as const;
  }
  if (kind === "debit") {
    return "warning" as const;
  }
  return "info" as const;
}

function balanceLabel(entry: WalletLedgerEntry): string {
  return formatMoney(entry.resulting_available_balance + entry.resulting_held_balance, entry.currency);
}

export function TransactionTable({ entries }: { entries: WalletLedgerEntry[] }) {
  const [typeFilter, setTypeFilter] = useState<TransactionKind>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const kind = entryKind(entry);
      const amount = Math.abs(entry.amount);
      const createdAt = new Date(entry.created_at);
      const query = searchTerm.trim().toLowerCase();
      const matchesQuery =
        query.length === 0 ||
        entry.reason.replaceAll("_", " ").toLowerCase().includes(query) ||
        entry.request_id.toLowerCase().includes(query);

      if (typeFilter !== "all" && kind !== typeFilter) {
        return false;
      }
      if (startDate && createdAt < new Date(`${startDate}T00:00:00`)) {
        return false;
      }
      if (endDate && createdAt > new Date(`${endDate}T23:59:59`)) {
        return false;
      }
      if (minAmount && amount < Number(minAmount)) {
        return false;
      }
      if (maxAmount && amount > Number(maxAmount)) {
        return false;
      }
      return matchesQuery;
    });
  }, [endDate, entries, maxAmount, minAmount, searchTerm, startDate, typeFilter]);

  const rows = useMemo<TransactionRow[]>(
    () =>
      filteredEntries.map((entry) => ({
        amount: formatMoney(entry.amount, entry.currency),
        balance: balanceLabel(entry),
        createdAt: entry.created_at,
        description: entry.reason.replaceAll("_", " "),
        entryId: entry.entry_id,
        kind: entryKind(entry),
        renderedDate: new Date(entry.created_at).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      })),
    [filteredEntries],
  );

  function resetFilters() {
    setTypeFilter("all");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
    setSearchTerm("");
  }

  function exportCsv() {
    const header = ["date", "description", "amount", "balance", "type", "entry_id"];
    const lines = rows.map((row) =>
      [row.createdAt, row.description, row.amount, row.balance, row.kind, row.entryId]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "agrodomain-wallet-transactions.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="wallet-transaction-shell">
      <div className="wallet-transaction-toolbar">
        <div className="wallet-toolbar-field wallet-toolbar-search">
          <span>Search</span>
          <div className="wallet-search-input">
            <Search size={16} />
            <Input
              aria-label="Search transactions"
              placeholder="Search by description or reference"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <label className="wallet-toolbar-field" htmlFor="transaction-type">
          <span>Type</span>
          <Select
            id="transaction-type"
            options={[
              { label: "All", value: "all" },
              { label: "Credits", value: "credit" },
              { label: "Debits", value: "debit" },
              { label: "Escrow", value: "escrow" },
            ]}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TransactionKind)}
          />
        </label>

        <label className="wallet-toolbar-field" htmlFor="transaction-start-date">
          <span>From</span>
          <Input
            id="transaction-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>

        <label className="wallet-toolbar-field" htmlFor="transaction-end-date">
          <span>To</span>
          <Input
            id="transaction-end-date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>

        <label className="wallet-toolbar-field" htmlFor="transaction-min-amount">
          <span>Min amount</span>
          <Input
            id="transaction-min-amount"
            inputMode="decimal"
            placeholder="0"
            value={minAmount}
            onChange={(event) => setMinAmount(event.target.value)}
          />
        </label>

        <label className="wallet-toolbar-field" htmlFor="transaction-max-amount">
          <span>Max amount</span>
          <Input
            id="transaction-max-amount"
            inputMode="decimal"
            placeholder="10000"
            value={maxAmount}
            onChange={(event) => setMaxAmount(event.target.value)}
          />
        </label>
      </div>

      <div className="wallet-toolbar-actions">
        <p>
          {rows.length} filtered transaction{rows.length === 1 ? "" : "s"} from {entries.length} total entries.
        </p>
        <div className="wallet-toolbar-buttons">
          <Button variant="ghost" onClick={resetFilters}>
            Reset filters
          </Button>
          <Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}>
            <Download size={16} />
            Export to CSV
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No transactions match this filter"
          body="Adjust the type, date range, or amount range to review more wallet movement."
        />
      ) : (
        <DataTable<TransactionRow>
          className="wallet-transaction-table"
          columns={[
            {
              key: "createdAt",
              header: "Date",
              render: (row) => <span>{row.renderedDate}</span>,
            },
            {
              key: "description",
              header: "Description",
              render: (row) => (
                <div className="wallet-transaction-description">
                  <strong>{row.description}</strong>
                  <span>{row.entryId}</span>
                </div>
              ),
            },
            {
              key: "amount",
              header: "Amount",
              render: (row) => <strong>{row.amount}</strong>,
            },
            {
              key: "balance",
              header: "Balance",
              render: (row) => <span>{row.balance}</span>,
            },
            {
              key: "kind",
              header: "Type",
              render: (row) => <Badge variant={badgeVariant(row.kind as Exclude<TransactionKind, "all">)}>{row.kind}</Badge>,
            },
          ]}
          data={rows}
          emptyMessage="No wallet movement yet."
          pageSize={6}
        />
      )}
    </div>
  );
}

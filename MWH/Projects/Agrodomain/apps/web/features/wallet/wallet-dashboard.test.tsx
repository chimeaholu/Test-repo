import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { mockAuditApi, mockRecordTelemetry, mockUseAppState, mockWalletApi } = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockRecordTelemetry: vi.fn(),
  mockAuditApi: {
    getEvents: vi.fn(),
  },
  mockWalletApi: {
    fundEscrow: vi.fn(),
    getWalletSummary: vi.fn(),
    listEscrows: vi.fn(),
    listWalletTransactions: vi.fn(),
    releaseEscrow: vi.fn(),
    reverseEscrow: vi.fn(),
    disputeEscrow: vi.fn(),
  },
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/audit", () => ({
  auditApi: mockAuditApi,
}));

vi.mock("@/lib/api/wallet", () => ({
  walletApi: mockWalletApi,
}));

vi.mock("@/lib/telemetry/client", () => ({
  recordTelemetry: (...args: unknown[]) => mockRecordTelemetry(...args),
}));

import { WalletDashboardClient } from "@/features/wallet/wallet-dashboard";

function buildSession(role: "buyer" | "farmer" = "buyer") {
  const actorId = role === "buyer" ? "actor-buyer" : "actor-seller";
  return {
    actor: {
      actor_id: actorId,
      display_name: role === "buyer" ? "Buyer Kojo" : "Seller Ama",
      email: role === "buyer" ? "buyer@example.com" : "seller@example.com",
      role,
      country_code: "GH",
      locale: "en-GH",
      membership: {
        organization_id: "org-1",
        organization_name: role === "buyer" ? "Buyer Org" : "Seller Org",
        role,
      },
    },
    consent: {
      actor_id: actorId,
      country_code: "GH",
      state: "consent_granted",
      policy_version: "2026.04.w1",
      scope_ids: ["identity.core", "workflow.audit"],
      channel: "pwa",
      captured_at: "2026-04-18T00:00:00.000Z",
      revoked_at: null,
    },
    available_roles: [role],
  };
}

function buildWalletSummary() {
  return {
    schema_version: "2026-04-18.wave1",
    wallet_id: "wallet-1",
    wallet_actor_id: "actor-buyer",
    country_code: "GH",
    currency: "GHS",
    available_balance: 200,
    held_balance: 400,
    total_balance: 600,
    balance_version: 3,
    last_entry_sequence: 3,
    last_reconciliation_marker: null,
    updated_at: "2026-04-18T01:00:00.000Z",
  };
}

function buildEscrow(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: "2026-04-18.wave1",
    escrow_id: "escrow-1",
    thread_id: "thread-1",
    listing_id: "listing-1",
    buyer_actor_id: "actor-buyer",
    seller_actor_id: "actor-seller",
    country_code: "GH",
    currency: "GHS",
    amount: 400,
    state: "partner_pending",
    partner_reference: null,
    partner_reason_code: "delivery_failed",
    funded_at: null,
    released_at: null,
    reversed_at: null,
    disputed_at: null,
    created_at: "2026-04-18T00:00:00.000Z",
    updated_at: "2026-04-18T01:00:00.000Z",
    timeline: [
      {
        schema_version: "2026-04-18.wave1",
        escrow_id: "escrow-1",
        transition: "partner_pending",
        state: "partner_pending",
        actor_id: "actor-buyer",
        note: "Funding partner timeout",
        request_id: "req-timeout",
        idempotency_key: "idem-timeout",
        correlation_id: "trace-wallet",
        created_at: "2026-04-18T01:00:00.000Z",
        notification: {
          schema_version: "2026-04-18.wave1",
          escrow_id: "escrow-1",
          settlement_state: "partner_pending",
          recipient_actor_id: "actor-seller",
          channel: "push",
          channel_origin: "pwa",
          delivery_state: "fallback_sent",
          fallback_channel: "sms",
          fallback_reason: "delivery_failed",
          message_key: "escrow.partner_pending",
          correlation_id: "trace-wallet",
          created_at: "2026-04-18T01:00:00.000Z",
        },
      },
    ],
    ...overrides,
  };
}

describe("wallet dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppState.mockReturnValue({
      queue: {
        connectivity_state: "degraded",
        handoff_channel: "sms",
        items: [
          {
            item_id: "queue-1",
            workflow_id: "wf-1",
            intent: "wallets.escrows.fund",
            payload: {},
            idempotency_key: "idem-queue-1",
            created_at: "2026-04-18T01:00:00.000Z",
            attempt_count: 1,
            state: "failed_retryable",
            last_error_code: "delivery_failed",
            conflict_code: null,
            result_ref: null,
            envelope: {
              metadata: {
                actor_id: "actor-buyer",
                channel: "pwa",
                correlation_id: "trace-wallet",
                country_code: "GH",
                idempotency_key: "idem-queue-1",
                occurred_at: "2026-04-18T01:00:00.000Z",
                request_id: "req-queue-1",
                schema_version: "2026-04-18.wave1",
                traceability: {
                  data_check_ids: ["offline_queue"],
                  journey_ids: ["offline:wf-1"],
                },
              },
              command: {
                aggregate_ref: "escrow-1",
                mutation_scope: "wallet.escrow",
                name: "wallets.escrows.fund",
                payload: {
                  workflow_id: "wf-1",
                  intent: "wallets.escrows.fund",
                  payload: {},
                },
              },
            },
          },
        ],
      },
      session: buildSession("buyer"),
      traceId: "trace-wallet",
    });
    mockWalletApi.getWalletSummary.mockResolvedValue({ data: buildWalletSummary() });
    mockWalletApi.listWalletTransactions.mockResolvedValue({
      data: {
        schema_version: "2026-04-18.wave1",
        wallet: buildWalletSummary(),
        items: [],
      },
    });
    mockWalletApi.listEscrows.mockResolvedValue({
      data: {
        schema_version: "2026-04-18.wave1",
        items: [buildEscrow()],
      },
    });
  });

  it("renders partner-pending fallback surfaces with outbox guidance", async () => {
    render(<WalletDashboardClient />);

    expect(await screen.findByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByText("Some payment updates still need attention")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review pending updates" })).toHaveAttribute("href", "/app/offline/outbox");
    expect(screen.getByText("Fallback sent via sms")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry funding" })).toBeEnabled();
  });

  it("submits a funding retry and renders request evidence", async () => {
    mockWalletApi.fundEscrow.mockResolvedValue({
      data: {
        escrow: buildEscrow({
          state: "funded",
          funded_at: "2026-04-18T01:05:00.000Z",
          partner_reason_code: null,
        }),
        wallet: buildWalletSummary(),
        escrow_transition: {
          escrow_id: "escrow-1",
          thread_id: "thread-1",
          transition: "funded",
          state: "funded",
          notification_count: 2,
        },
        settlement_notifications: [],
        schema_version: "2026-04-18.wave1",
        request_id: "req-funded",
        idempotency_key: "idem-funded",
        replayed: true,
      },
    });
    mockAuditApi.getEvents.mockResolvedValue({ data: { items: [{}, {}] } });

    render(<WalletDashboardClient />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry funding" }));

    await waitFor(() => {
      expect(mockWalletApi.fundEscrow).toHaveBeenCalledWith(
        {
          escrow_id: "escrow-1",
          note: "Reviewed the latest delivery update before taking action.",
          partner_outcome: "funded",
        },
        "trace-wallet",
        "actor-buyer",
        "GH",
      );
    });

    expect(await screen.findByText("Latest wallet action")).toBeInTheDocument();
    expect(screen.getByText("Updated again")).toBeInTheDocument();
    expect(screen.getByText("req-funded")).toBeInTheDocument();
    expect(screen.getByText("idem-funded")).toBeInTheDocument();

    const evidenceCard = screen.getByText("Latest wallet action").closest("section");
    expect(evidenceCard).toHaveTextContent("Timeline updates");
    expect(evidenceCard).toHaveTextContent("Payment messages");
  });

  it("reloads balance and transaction data when the display currency changes", async () => {
    render(<WalletDashboardClient />);

    const currencySelector = await screen.findByLabelText("Display currency");
    fireEvent.change(currencySelector, { target: { value: "USD" } });

    await waitFor(() => {
      expect(mockWalletApi.getWalletSummary).toHaveBeenLastCalledWith("trace-wallet", "USD");
      expect(mockWalletApi.listWalletTransactions).toHaveBeenLastCalledWith("trace-wallet", "USD");
    });
  });
});

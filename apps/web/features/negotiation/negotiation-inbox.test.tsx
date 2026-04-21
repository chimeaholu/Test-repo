import "@testing-library/jest-dom/vitest";
import type { IdentitySession, NegotiationThreadRead } from "@agrodomain/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAgroApiClient, mockRecordTelemetry, mockUseAppState } = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockRecordTelemetry: vi.fn(),
  mockAgroApiClient: {
    approveNegotiationConfirmation: vi.fn(),
    counterNegotiation: vi.fn(),
    createNegotiation: vi.fn(),
    getAuditEvents: vi.fn(),
    getNegotiationThread: vi.fn(),
    listNegotiations: vi.fn(),
    rejectNegotiationConfirmation: vi.fn(),
    requestNegotiationConfirmation: vi.fn(),
  },
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/mock-client", () => ({
  agroApiClient: mockAgroApiClient,
}));

vi.mock("@/lib/telemetry/client", () => ({
  recordTelemetry: (...args: unknown[]) => mockRecordTelemetry(...args),
}));

import { NegotiationInboxClient } from "@/features/negotiation/negotiation-inbox";

function buildSession(role: IdentitySession["actor"]["role"]): IdentitySession {
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

function buildThread(overrides: Partial<NegotiationThreadRead> = {}): NegotiationThreadRead {
  return {
    schema_version: "2026-04-18.wave1",
    thread_id: "thread-1",
    listing_id: "listing-1",
    seller_actor_id: "actor-seller",
    buyer_actor_id: "actor-buyer",
    country_code: "GH",
    status: "open",
    current_offer_amount: 510,
    current_offer_currency: "GHS",
    last_action_at: "2026-04-18T01:00:00.000Z",
    created_at: "2026-04-18T00:00:00.000Z",
    updated_at: "2026-04-18T01:00:00.000Z",
    confirmation_checkpoint: null,
    messages: [
      {
        schema_version: "2026-04-18.wave1",
        actor_id: "actor-buyer",
        action: "offer_created",
        amount: 500,
        currency: "GHS",
        note: "Initial buyer offer",
        created_at: "2026-04-18T00:10:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("negotiation inbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits a buyer offer and renders audit/idempotency evidence", async () => {
    const createdThread = buildThread();

    mockUseAppState.mockReturnValue({
      session: buildSession("buyer"),
      traceId: "trace-negotiation-create",
    });
    mockAgroApiClient.listNegotiations
      .mockResolvedValueOnce({ data: { schema_version: "2026-04-18.wave1", items: [] } })
      .mockResolvedValueOnce({ data: { schema_version: "2026-04-18.wave1", items: [createdThread] } });
    mockAgroApiClient.createNegotiation.mockResolvedValue({
      data: {
        thread: createdThread,
        request_id: "req-neg-create",
        idempotency_key: "idem-neg-create",
        replayed: false,
      },
    });
    mockAgroApiClient.getNegotiationThread.mockResolvedValue({ data: createdThread });
    mockAgroApiClient.getAuditEvents.mockResolvedValue({ data: { items: [{}, {}, {}] } });

    render(<NegotiationInboxClient initialListingId="listing-1" />);

    expect(await screen.findByRole("heading", { name: "Buyer offer composer" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Offer amount"), {
      target: { value: "500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create offer thread" }));

    await waitFor(() => {
      expect(mockAgroApiClient.createNegotiation).toHaveBeenCalledWith(
        expect.objectContaining({
          listing_id: "listing-1",
          offer_amount: 500,
          offer_currency: "GHS",
        }),
        "trace-negotiation-create",
        "actor-buyer",
        "GH",
      );
    });

    expect(await screen.findByText("Single effect")).toBeInTheDocument();
    expect(screen.getByText("Request ID: req-neg-create")).toBeInTheDocument();
    expect(screen.getByText("Audit events returned: 3")).toBeInTheDocument();
  });

  it("renders pending confirmation controls only for the authorized confirmer", async () => {
    const thread = buildThread({
      status: "pending_confirmation",
      confirmation_checkpoint: {
        requested_by_actor_id: "actor-seller",
        required_confirmer_actor_id: "actor-buyer",
        requested_at: "2026-04-18T01:10:00.000Z",
        note: "Need final buyer confirmation",
      },
      messages: [
        {
          schema_version: "2026-04-18.wave1",
          actor_id: "actor-seller",
          action: "confirmation_requested",
          amount: null,
          currency: null,
          note: "Need final buyer confirmation",
          created_at: "2026-04-18T01:10:00.000Z",
        },
      ],
    });

    mockUseAppState.mockReturnValue({
      session: buildSession("buyer"),
      traceId: "trace-negotiation-pending",
    });
    mockAgroApiClient.listNegotiations.mockResolvedValue({
      data: { schema_version: "2026-04-18.wave1", items: [thread] },
    });
    mockAgroApiClient.getNegotiationThread.mockResolvedValue({ data: thread });

    render(<NegotiationInboxClient initialThreadId="thread-1" />);

    expect(await screen.findByText("Waiting for confirmation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve thread" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject thread" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit counter" })).not.toBeInTheDocument();
  });

  it("surfaces inaccessible thread handling when the selected thread is outside actor scope", async () => {
    mockUseAppState.mockReturnValue({
      session: buildSession("buyer"),
      traceId: "trace-negotiation-unauthorized",
    });
    mockAgroApiClient.listNegotiations.mockResolvedValue({
      data: { schema_version: "2026-04-18.wave1", items: [] },
    });
    mockAgroApiClient.getNegotiationThread.mockRejectedValue(new Error("thread_not_found"));

    render(<NegotiationInboxClient initialThreadId="thread-outsider" />);

    expect(await screen.findByText("Thread not available in your actor scope")).toBeInTheDocument();
    expect(screen.getByText("The selected thread is unavailable in your actor scope or no longer exists.")).toBeInTheDocument();
  });

  it("shows terminal lock behavior for accepted threads and hides mutating controls", async () => {
    const thread = buildThread({
      status: "accepted",
      confirmation_checkpoint: null,
      messages: [
        {
          schema_version: "2026-04-18.wave1",
          actor_id: "actor-buyer",
          action: "confirmation_approved",
          amount: null,
          currency: null,
          note: "Buyer confirms final offer",
          created_at: "2026-04-18T01:20:00.000Z",
        },
      ],
    });

    mockUseAppState.mockReturnValue({
      session: buildSession("farmer"),
      traceId: "trace-negotiation-terminal",
    });
    mockAgroApiClient.listNegotiations.mockResolvedValue({
      data: { schema_version: "2026-04-18.wave1", items: [thread] },
    });
    mockAgroApiClient.getNegotiationThread.mockResolvedValue({ data: thread });

    render(<NegotiationInboxClient initialThreadId="thread-1" />);

    expect(await screen.findByText("Terminal-state lock is active")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit counter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move to pending confirmation" })).not.toBeInTheDocument();
  });
});

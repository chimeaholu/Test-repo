import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

const {
  mockAdvisoryApi,
  mockClimateApi,
  mockMarketplaceApi,
  mockUseAppState,
  mockWalletApi,
} = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockMarketplaceApi: {
    listListings: vi.fn(),
    listNegotiations: vi.fn(),
  },
  mockWalletApi: {
    getWalletSummary: vi.fn(),
    listEscrows: vi.fn(),
  },
  mockAdvisoryApi: {
    listConversations: vi.fn(),
  },
  mockClimateApi: {
    listRuntime: vi.fn(),
  },
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/marketplace", () => ({
  marketplaceApi: mockMarketplaceApi,
}));

vi.mock("@/lib/api/wallet", () => ({
  walletApi: mockWalletApi,
}));

vi.mock("@/lib/api/advisory", () => ({
  advisoryApi: mockAdvisoryApi,
}));

vi.mock("@/lib/api/climate", () => ({
  climateApi: mockClimateApi,
}));

import { AgentDashboard } from "@/components/dashboards/agent-dashboard";
import { BuyerDashboard } from "@/components/dashboards/buyer-dashboard";
import { TransporterDashboard } from "@/components/dashboards/transporter-dashboard";

function buildSession(role: "buyer" | "advisor" | "admin") {
  return {
    actor: {
      actor_id: `actor-${role}`,
      display_name: `${role} user`,
      email: `${role}@example.com`,
      role,
      country_code: "GH",
      locale: "en-GH",
      membership: {
        organization_id: "org-1",
        organization_name: "Org 1",
        role,
      },
    },
    consent: {
      actor_id: `actor-${role}`,
      country_code: "GH",
      state: "consent_granted",
      policy_version: "2026.04.r3",
      scope_ids: ["identity.core", "workflow.audit"],
      channel: "pwa",
      captured_at: "2026-04-18T00:00:00.000Z",
      revoked_at: null,
    },
    available_roles: [role],
  };
}

describe("r3 role dashboards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders buyer KPIs and shipment quick action from live marketplace data", async () => {
    mockUseAppState.mockReturnValue({
      session: buildSession("buyer"),
      traceId: "trace-buyer",
    });
    mockMarketplaceApi.listListings.mockResolvedValue({
      data: {
        items: [
          {
            listing_id: "listing-1",
            actor_id: "actor-farmer",
            country_code: "GH",
            title: "Premium maize",
            commodity: "maize",
            quantity_tons: 10,
            price_amount: 400,
            price_currency: "GHS",
            location: "Tamale",
            summary: "Machine-dried lot with quality proof attached.",
            status: "published",
            revision_number: 1,
            published_revision_number: 1,
            revision_count: 1,
            has_unpublished_changes: false,
            view_scope: "buyer_safe",
            published_at: "2026-04-18T00:00:00.000Z",
            created_at: "2026-04-18T00:00:00.000Z",
            updated_at: "2026-04-18T00:00:00.000Z",
            schema_version: "2026.04.r3",
          },
        ],
      },
    });
    mockMarketplaceApi.listNegotiations.mockResolvedValue({
      data: {
        items: [
          {
            thread_id: "thread-1",
            listing_id: "listing-1",
            seller_actor_id: "actor-farmer",
            buyer_actor_id: "actor-buyer",
            country_code: "GH",
            status: "open",
            current_offer_amount: 390,
            current_offer_currency: "GHS",
            last_action_at: "2026-04-18T01:00:00.000Z",
            created_at: "2026-04-18T00:00:00.000Z",
            updated_at: "2026-04-18T01:00:00.000Z",
            confirmation_checkpoint: null,
            messages: [],
            schema_version: "2026.04.r3",
          },
        ],
      },
    });
    mockWalletApi.listEscrows.mockResolvedValue({
      data: {
        items: [
          {
            escrow_id: "escrow-1",
            thread_id: "thread-1",
            listing_id: "listing-1",
            buyer_actor_id: "actor-buyer",
            seller_actor_id: "actor-farmer",
            country_code: "GH",
            currency: "GHS",
            amount: 390,
            state: "released",
            partner_reference: null,
            partner_reason_code: null,
            funded_at: "2026-04-18T01:00:00.000Z",
            released_at: "2026-04-18T02:00:00.000Z",
            reversed_at: null,
            disputed_at: null,
            created_at: "2026-04-18T00:00:00.000Z",
            updated_at: "2026-04-18T02:00:00.000Z",
            timeline: [],
            schema_version: "2026.04.r3",
          },
        ],
      },
    });
    mockWalletApi.getWalletSummary.mockResolvedValue({
      data: {
        wallet_id: "wallet-1",
        wallet_actor_id: "actor-buyer",
        country_code: "GH",
        currency: "GHS",
        available_balance: 250,
        held_balance: 0,
        total_balance: 250,
        balance_version: 1,
        last_entry_sequence: 1,
        last_reconciliation_marker: null,
        updated_at: "2026-04-18T02:00:00.000Z",
        schema_version: "2026.04.r3",
      },
    });

    render(<BuyerDashboard />);

    expect(await screen.findByText("Available lots")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockMarketplaceApi.listListings).toHaveBeenCalledWith("trace-buyer");
      expect(mockWalletApi.getWalletSummary).toHaveBeenCalledWith("trace-buyer");
    });
    expect(screen.getByRole("link", { name: /track delivery/i })).toHaveAttribute(
      "href",
      "/app/traceability/listing-1",
    );
  });

  it("renders transporter shipment links from escrow-backed activity", async () => {
    mockUseAppState.mockReturnValue({
      session: buildSession("admin"),
      traceId: "trace-transporter",
    });
    mockMarketplaceApi.listListings.mockResolvedValue({
      data: {
        items: [
          {
            listing_id: "listing-9",
            actor_id: "actor-farmer",
            country_code: "GH",
            title: "Cassava load",
            commodity: "cassava",
            quantity_tons: 18,
            price_amount: 800,
            price_currency: "GHS",
            location: "Kumasi",
            summary: "Bulk cassava load ready for dispatch.",
            status: "published",
            revision_number: 1,
            published_revision_number: 1,
            revision_count: 1,
            has_unpublished_changes: false,
            view_scope: "buyer_safe",
            published_at: "2026-04-18T00:00:00.000Z",
            created_at: "2026-04-18T00:00:00.000Z",
            updated_at: "2026-04-18T00:00:00.000Z",
            schema_version: "2026.04.r3",
          },
        ],
      },
    });
    mockMarketplaceApi.listNegotiations.mockResolvedValue({
      data: {
        items: [],
      },
    });
    mockWalletApi.listEscrows.mockResolvedValue({
      data: {
        items: [
          {
            escrow_id: "escrow-9",
            thread_id: "thread-9",
            listing_id: "listing-9",
            buyer_actor_id: "actor-buyer",
            seller_actor_id: "actor-farmer",
            country_code: "GH",
            currency: "GHS",
            amount: 800,
            state: "funded",
            partner_reference: null,
            partner_reason_code: null,
            funded_at: "2026-04-18T02:00:00.000Z",
            released_at: null,
            reversed_at: null,
            disputed_at: null,
            created_at: "2026-04-18T00:00:00.000Z",
            updated_at: "2026-04-18T02:00:00.000Z",
            timeline: [
              {
                escrow_id: "escrow-9",
                transition: "funded",
                state: "funded",
                actor_id: "actor-buyer",
                note: null,
                request_id: "req-1",
                idempotency_key: "idem-1",
                correlation_id: "corr-1",
                created_at: "2026-04-18T02:00:00.000Z",
                notification: null,
                schema_version: "2026.04.r3",
              },
            ],
            schema_version: "2026.04.r3",
          },
        ],
      },
    });

    render(<TransporterDashboard />);

    expect(await screen.findByText("Transport workspace")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockWalletApi.listEscrows).toHaveBeenCalledWith("trace-transporter");
    });
    expect(screen.getByRole("link", { name: /active shipments/i })).toHaveAttribute(
      "href",
      "/app/traceability/listing-9",
    );
  });

  it("renders extension agent queue metrics from advisory data", async () => {
    mockUseAppState.mockReturnValue({
      session: buildSession("advisor"),
      traceId: "trace-agent",
    });
    mockAdvisoryApi.listConversations.mockResolvedValue({
      data: {
        items: [
          {
            advisory_request_id: "adv-1",
            advisory_conversation_id: "conv-1",
            actor_id: "actor-farmer-1",
            country_code: "GH",
            locale: "en-GH",
            topic: "Soil moisture check",
            question_text: "What should I do after heavy rain this week?",
            response_text: "Inspect drainage before adding inputs.",
            status: "hitl_required",
            confidence_band: "medium",
            confidence_score: 0.61,
            grounded: true,
            citations: [
              {
                source_id: "kb-1",
                title: "Drainage checklist",
                source_type: "extension",
                locale: "en-GH",
                country_code: "GH",
                citation_url: "https://example.com/kb-1",
                published_at: "2026-04-18T00:00:00.000Z",
                excerpt: "Inspect the drainage pattern first.",
                method_tag: "drainage-check",
              },
            ],
            transcript_entries: [
              {
                speaker: "user",
                message: "My field is soggy.",
                captured_at: "2026-04-18T00:00:00.000Z",
                channel: "pwa",
              },
            ],
            reviewer_decision: {
              advisory_request_id: "adv-1",
              decision_id: "decision-1",
              actor_id: "reviewer-1",
              actor_role: "advisor",
              outcome: "hitl_required",
              reason_code: "policy_sensitive",
              note: "Needs a human agronomist before delivery.",
              transcript_link: null,
              policy_context: {
                matched_policy: "crop_health.general",
                confidence_threshold: 0.75,
                policy_sensitive: true,
              },
              created_at: "2026-04-18T01:00:00.000Z",
              schema_version: "2026.04.r3",
            },
            source_ids: ["kb-1"],
            model_name: "agro-advisor",
            model_version: "2026.04",
            correlation_id: "corr-1",
            request_id: "req-1",
            delivered_at: null,
            created_at: "2026-04-18T01:00:00.000Z",
            schema_version: "2026.04.r3",
          },
          {
            advisory_request_id: "adv-2",
            advisory_conversation_id: "conv-2",
            actor_id: "actor-farmer-2",
            country_code: "GH",
            locale: "en-GH",
            topic: "Leaf discoloration",
            question_text: "Why are the leaves changing color after planting?",
            response_text: "Check the nutrient plan and standing water.",
            status: "delivered",
            confidence_band: "high",
            confidence_score: 0.92,
            grounded: true,
            citations: [
              {
                source_id: "kb-2",
                title: "Leaf stress guide",
                source_type: "manual",
                locale: "en-GH",
                country_code: "GH",
                citation_url: "https://example.com/kb-2",
                published_at: "2026-04-18T00:00:00.000Z",
                excerpt: "Compare affected rows against unaffected rows.",
                method_tag: "stress-check",
              },
            ],
            transcript_entries: [
              {
                speaker: "user",
                message: "The leaves changed color.",
                captured_at: "2026-04-18T00:00:00.000Z",
                channel: "pwa",
              },
            ],
            reviewer_decision: {
              advisory_request_id: "adv-2",
              decision_id: "decision-2",
              actor_id: "reviewer-2",
              actor_role: "advisor",
              outcome: "approve",
              reason_code: "evidence_sufficient",
              note: "Ready to send.",
              transcript_link: null,
              policy_context: {
                matched_policy: "crop_health.general",
                confidence_threshold: 0.75,
                policy_sensitive: false,
              },
              created_at: "2026-04-18T02:00:00.000Z",
              schema_version: "2026.04.r3",
            },
            source_ids: ["kb-2"],
            model_name: "agro-advisor",
            model_version: "2026.04",
            correlation_id: "corr-2",
            request_id: "req-2",
            delivered_at: "2026-04-18T02:00:00.000Z",
            created_at: "2026-04-18T02:00:00.000Z",
            schema_version: "2026.04.r3",
          },
        ],
        runtime_mode: "live",
      },
    });
    mockClimateApi.listRuntime.mockResolvedValue({
      data: {
        alerts: [
          {
            alert_id: "alert-1",
            farm_profile_id: "farm-1",
            country_code: "GH",
            locale: "en-GH",
            severity: "warning",
            title: "Heavy rain watch",
            summary: "Watch low-lying fields over the next 24 hours.",
            source_ids: ["source-1"],
            degraded_mode: false,
            acknowledged: false,
            created_at: "2026-04-18T00:00:00.000Z",
            schema_version: "2026.04.r3",
          },
        ],
        degraded_modes: [],
        evidence_records: [],
        runtime_mode: "live",
      },
    });

    render(<AgentDashboard />);

    expect(await screen.findByText("Open cases")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockAdvisoryApi.listConversations).toHaveBeenCalledWith("trace-agent", "en-GH");
      expect(mockClimateApi.listRuntime).toHaveBeenCalledWith("trace-agent", "en-GH");
    });
    expect(screen.getByRole("link", { name: /open requests/i })).toHaveAttribute("href", "/app/advisor/requests");
  });
});

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const {
  mockAdvisoryApi,
  mockRecordTelemetry,
  mockSendCommand,
  mockUseAppState,
  mockUsePathname,
} = vi.hoisted(() => ({
  mockAdvisoryApi: {
    listConversations: vi.fn(),
  },
  mockRecordTelemetry: vi.fn(),
  mockSendCommand: vi.fn(),
  mockUseAppState: vi.fn(),
  mockUsePathname: vi.fn(),
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("@/lib/api/advisory", () => ({
  advisoryApi: mockAdvisoryApi,
}));

vi.mock("@/lib/api-client", () => ({
  sendCommand: (...args: unknown[]) => mockSendCommand(...args),
}));

vi.mock("@/lib/telemetry/client", () => ({
  recordTelemetry: (...args: unknown[]) => mockRecordTelemetry(...args),
}));

import { AgroGuideAssistantPanel } from "@/components/agroguide";

function advisoryItem(overrides: Record<string, unknown> = {}) {
  return {
    actor_id: "actor-farmer",
    advisory_conversation_id: "conversation-1",
    advisory_request_id: "adv-1",
    citations: [
      {
        citation_url: "https://example.com/guide",
        country_code: "GH",
        excerpt: "Grounded recommendation excerpt for the assistant panel.",
        locale: "en-GH",
        method_tag: "field-guide",
        published_at: "2026-04-25T00:00:00.000Z",
        source_id: "src-1",
        source_type: "extension",
        title: "Field Guide",
      },
    ],
    confidence_band: "high",
    confidence_score: 0.91,
    correlation_id: "corr-1",
    country_code: "GH",
    created_at: "2026-04-25T00:00:00.000Z",
    delivered_at: "2026-04-25T00:01:00.000Z",
    grounded: true,
    locale: "en-GH",
    model_name: "agro-advisor",
    model_version: "n4",
    question_text: "What should I do after heavy rain on my cassava field?",
    request_id: "req-1",
    response_text: "Inspect drainage before treating the field and compare lower rows with higher ground.",
    reviewer_decision: {
      actor_id: "reviewer-1",
      actor_role: "advisor",
      advisory_request_id: "adv-1",
      created_at: "2026-04-25T00:01:00.000Z",
      decision_id: "review-1",
      note: "Grounded response cleared for delivery.",
      outcome: "approve",
      policy_context: {
        confidence_threshold: 0.75,
        matched_policy: "crop_health.general",
        policy_sensitive: false,
      },
      reason_code: "evidence_sufficient",
      schema_version: "2026-04-18.wave4",
      transcript_link: "advisory://review-1",
    },
    schema_version: "2026-04-18.wave4",
    source_ids: ["src-1"],
    status: "delivered",
    topic: "Post-rain field check",
    transcript_entries: [
      {
        captured_at: "2026-04-25T00:00:00.000Z",
        channel: "pwa",
        message: "What should I do after heavy rain on my cassava field?",
        speaker: "user",
      },
    ],
    ...overrides,
  };
}

describe("AgroGuideAssistantPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/app/market/listings");
    mockUseAppState.mockReturnValue({
      queue: { connectivity_state: "online", handoff_channel: null, items: [] },
      session: {
        actor: {
          actor_id: "actor-farmer",
          country_code: "GH",
          display_name: "Ama",
          email: "ama@example.com",
          locale: "en-GH",
          membership: {
            organization_id: "org-1",
            organization_name: "Agrodomain",
            role: "farmer",
          },
          role: "farmer",
        },
        available_roles: ["farmer"],
        consent: {
          actor_id: "actor-farmer",
          captured_at: "2026-04-25T00:00:00.000Z",
          channel: "pwa",
          country_code: "GH",
          policy_version: "2026.04",
          revoked_at: null,
          scope_ids: ["identity.core"],
          state: "consent_granted",
        },
      },
      traceId: "trace-agroguide",
    });
  });

  it("renders contextual market quick actions and advisory history", async () => {
    mockAdvisoryApi.listConversations.mockResolvedValue({
      data: {
        items: [advisoryItem()],
        runtime_mode: "live",
      },
    });

    render(<AgroGuideAssistantPanel onClose={() => undefined} open />);

    expect(await screen.findByText("AgroGuide")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Current market prices" })).toBeInTheDocument();
    expect(await screen.findByText(/Inspect drainage before treating the field/i)).toBeInTheDocument();
    expect(screen.getByText(/Sources: Field Guide/i)).toBeInTheDocument();
  });

  it("submits quick actions and photo diagnosis through advisory flows", async () => {
    mockAdvisoryApi.listConversations
      .mockResolvedValueOnce({
        data: {
          items: [advisoryItem()],
          runtime_mode: "live",
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            advisoryItem({
              advisory_request_id: "adv-2",
              question_text:
                "Show the current market prices relevant to my active crops and explain whether I should hold, sell, or negotiate today.",
              request_id: "req-2",
              response_text: "Cassava is firm this week. Hold low-grade stock and negotiate premium lots.",
              topic: "Market timing",
            }),
            advisoryItem(),
          ],
          runtime_mode: "live",
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            advisoryItem({
              advisory_request_id: "adv-3",
              confidence_band: "medium",
              question_text:
                "Review the uploaded crop image named leaf.jpg and give me a likely diagnosis, confidence, immediate action, and any safe follow-up steps.",
              request_id: "req-3",
              response_text: "Likely leaf blight. Isolate the patch and confirm spread before spraying.",
              topic: "Leaf blight diagnosis",
            }),
            advisoryItem(),
          ],
          runtime_mode: "live",
        },
      });

    mockSendCommand
      .mockResolvedValueOnce({
        data: {
          idempotency_key: "idem-2",
          replayed: false,
          request_id: "req-2",
        },
      })
      .mockResolvedValueOnce({
        data: {
          idempotency_key: "idem-3",
          replayed: false,
          request_id: "req-3",
        },
      });

    const { container } = render(<AgroGuideAssistantPanel onClose={() => undefined} open />);

    expect(await screen.findByText(/Inspect drainage before treating the field/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Current market prices" }));

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Cassava is firm this week/i)).toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error("Expected hidden file input");
    }

    fireEvent.change(fileInput, {
      target: {
        files: [new File(["photo"], "leaf.jpg", { type: "image/jpeg" })],
      },
    });

    await waitFor(() => expect(mockSendCommand).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Leaf blight diagnosis")).toBeInTheDocument();
    expect(screen.getByText(/Likely leaf blight/i)).toBeInTheDocument();
  });
});

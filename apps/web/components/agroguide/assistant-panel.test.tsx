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
  mockCopilotApi,
  mockRecordTelemetry,
  mockRouterPush,
  mockUseAppState,
  mockUsePathname,
} = vi.hoisted(() => ({
  mockAdvisoryApi: {
    executeAction: vi.fn(),
    resolve: vi.fn(),
    listConversations: vi.fn(),
    executeRecommendation: vi.fn(),
    listRecommendations: vi.fn(),
  },
  mockCopilotApi: {
    executeAction: vi.fn(),
    executeRecommendation: vi.fn(),
    listRecommendations: vi.fn(),
    resolve: vi.fn(),
  },
  mockRecordTelemetry: vi.fn(),
  mockRouterPush: vi.fn(),
  mockUseAppState: vi.fn(),
  mockUsePathname: vi.fn(),
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@/lib/api/advisory", () => ({
  advisoryApi: mockAdvisoryApi,
}));

vi.mock("@/lib/api/copilot", () => ({
  copilotApi: mockCopilotApi,
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

function recommendationItem(overrides: Record<string, unknown> = {}) {
  return {
    action: {
      aggregate_ref: "listing-1",
      channel_seam: {
        delivery_key: "copilot.marketplace.publish_listing",
        fallback_channels: ["whatsapp", "sms"],
        supported_channels: ["web", "whatsapp", "sms"],
        web_label: "Publish listing",
      },
      command_name: "market.listings.publish",
      data_check_ids: ["DI-001"],
      journey_ids: ["CJ-002", "CJ-003"],
      kind: "workflow_command",
      label: "Publish listing",
      mutation_scope: "marketplace.listings",
      payload: { listing_id: "listing-1" },
      requires_confirmation: true,
      route: "/market/my-listings",
      transport_endpoint: null,
    },
    actor_id: "actor-farmer",
    category: "marketplace",
    country_code: "GH",
    created_at: "2026-04-25T00:00:00.000Z",
    guardrails: [
      "Publishes only the listing you own.",
      "Requires confirmation before the workflow command is sent.",
    ],
    priority: "high",
    rationale: "The draft listing is still private to buyers.",
    recommendation_id: "rec-1",
    role: "farmer",
    schema_version: "2026-04-18.wave4",
    source_domains: ["marketplace"],
    source_refs: ["listing-1"],
    summary: "Publish your cassava listing so buyers can discover it.",
    title: "Publish your cassava listing",
    ...overrides,
  };
}

function copilotResolution(overrides: Record<string, unknown> = {}) {
  return {
    action: {
      adapter: "advisory.requests.submit",
      aggregate_ref: "advisory",
      command_name: "advisory.requests.submit",
      confirmation_required: false,
      mutation_scope: "advisory.requests",
      payload: {
        locale: "en-GH",
        policy_context: { sensitive_topics: [] },
        question_text:
          "Show the current market prices relevant to my active crops and explain whether I should hold, sell, or negotiate today.",
        topic: "Market timing",
        transcript_entries: [],
      },
      target: {
        aggregate_id: "actor-farmer",
        aggregate_type: "advisory_workspace",
        label: "Advisory workspace",
      },
    },
    actor_id: "actor-farmer",
    channel_dispatch: {
      dedupe_key: "/app/market/listings:advisory.ask:actor-farmer",
      escalate_after: "2026-04-25T00:30:00.000Z",
      expires_at: "2026-04-25T12:00:00.000Z",
      fallback_channels: ["whatsapp", "sms"],
      notification_id: "copilot-res-1",
      payload: { source: "copilot", summary: "AgroGuide can answer this as a grounded advisory request." },
      preferred_channels: ["in_app"],
      queue_state: "queued",
      schema_version: "2026-04-18.wave4",
      template_key: "copilot.advisory.ask.resolution",
    },
    confirmation_copy: null,
    country_code: "GH",
    created_at: "2026-04-25T00:00:00.000Z",
    explanation: "The request will go through the advisory workflow.",
    human_handoff: {
      queue_label: "AgroGuide operator queue",
      reason_code: "copilot_self_service",
      required: false,
      reviewer_roles: ["advisor"],
    },
    intent: "advisory.ask",
    locale: "en-GH",
    request_text:
      "Show the current market prices relevant to my active crops and explain whether I should hold, sell, or negotiate today.",
    resolution_id: "res-1",
    route_path: "/app/market/listings",
    schema_version: "2026-04-18.wave4",
    status: "ready",
    summary: "AgroGuide can answer this as a grounded advisory request.",
    ...overrides,
  };
}

function copilotExecutionResult(overrides: Record<string, unknown> = {}) {
  return {
    adapter: "advisory.requests.submit",
    audit_event_id: 42,
    channel_dispatch: {
      dedupe_key: "/app/market/listings:advisory.ask:actor-farmer",
      escalate_after: "2026-04-25T00:30:00.000Z",
      expires_at: "2026-04-25T12:00:00.000Z",
      fallback_channels: ["whatsapp", "sms"],
      notification_id: "copilot-res-1",
      payload: { source: "copilot", summary: "AgroGuide submitted the advisory request." },
      preferred_channels: ["in_app"],
      queue_state: "queued",
      schema_version: "2026-04-18.wave4",
      template_key: "copilot.advisory.ask.execution",
    },
    completed_at: "2026-04-25T00:01:00.000Z",
    human_handoff: {
      queue_label: "AgroGuide operator queue",
      reason_code: "copilot_self_service",
      required: false,
      reviewer_roles: ["advisor"],
    },
    intent: "advisory.ask",
    notification: {
      delivery_state: "sent",
      error_code: null,
      fallback_channel: null,
      fallback_reason: null,
      notification_id: "copilot-res-1",
      retryable: false,
      schema_version: "2026-04-18.wave4",
    },
    resolution_id: "res-1",
    result: {
      advisory_request: {
        request_id: "req-2",
      },
    },
    schema_version: "2026-04-18.wave4",
    status: "completed",
    summary: "AgroGuide submitted the advisory request.",
    ...overrides,
  };
}

describe("AgroGuideAssistantPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/app/market/listings");
    mockCopilotApi.listRecommendations.mockResolvedValue({
      data: {
        items: [],
        schema_version: "2026-04-18.wave4",
        supports_non_web_delivery: true,
      },
    });
    mockCopilotApi.resolve.mockResolvedValue({
      data: copilotResolution(),
    });
    mockCopilotApi.executeAction.mockResolvedValue({
      data: copilotExecutionResult(),
    });
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
    mockCopilotApi.listRecommendations.mockResolvedValue({
      data: {
        items: [recommendationItem()],
        schema_version: "2026-04-18.wave4",
        supports_non_web_delivery: true,
      },
    });

    render(<AgroGuideAssistantPanel onClose={() => undefined} open />);

    expect(await screen.findByText("AgroGuide")).toBeInTheDocument();
    expect(await screen.findByText("Recommended next steps")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish listing" })).toBeInTheDocument();
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
    mockCopilotApi.listRecommendations.mockResolvedValue({
      data: {
        items: [],
        schema_version: "2026-04-18.wave4",
        supports_non_web_delivery: true,
      },
    });

    mockCopilotApi.resolve
      .mockResolvedValueOnce({
        data: {
          ...copilotResolution(),
          action: {
            ...copilotResolution().action,
            payload: {
              locale: "en-GH",
              policy_context: { sensitive_topics: [] },
              question_text:
                "Show the current market prices relevant to my active crops and explain whether I should hold, sell, or negotiate today.",
              topic: "Market timing",
              transcript_entries: [],
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          ...copilotResolution({
            request_text:
              "Review the uploaded crop image named leaf.jpg and give me a likely diagnosis, confidence, immediate action, and any safe follow-up steps.",
            resolution_id: "res-2",
            route_path: "/app/market/listings",
          }),
          action: {
            ...copilotResolution().action,
            payload: {
              locale: "en-GH",
              policy_context: { sensitive_topics: [] },
              question_text:
                "Review the uploaded crop image named leaf.jpg and give me a likely diagnosis, confidence, immediate action, and any safe follow-up steps.",
              topic: "Crop photo diagnosis",
              transcript_entries: [
                {
                  captured_at: "2026-04-25T00:00:00.000Z",
                  channel: "pwa",
                  message: "Uploaded image leaf.jpg (image/jpeg, 5 bytes).",
                  speaker: "user",
                },
              ],
            },
          },
        },
      });
    mockCopilotApi.executeAction
      .mockResolvedValueOnce({
        data: copilotExecutionResult(),
      })
      .mockResolvedValueOnce({
        data: copilotExecutionResult({
          resolution_id: "res-2",
          result: {
            advisory_request: {
              request_id: "req-3",
            },
          },
        }),
      });

    const { container } = render(<AgroGuideAssistantPanel onClose={() => undefined} open />);

    expect(await screen.findByText(/Inspect drainage before treating the field/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Current market prices" }));

    await waitFor(() => expect(mockCopilotApi.resolve).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockCopilotApi.executeAction).toHaveBeenCalledTimes(1));
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

    await waitFor(() => expect(mockCopilotApi.resolve).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockCopilotApi.executeAction).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Leaf blight diagnosis")).toBeInTheDocument();
    expect(screen.getByText(/Likely leaf blight/i)).toBeInTheDocument();
  });

  it("shows confirmation and escalation controls for copilot mutation requests", async () => {
    mockAdvisoryApi.listConversations.mockResolvedValue({
      data: {
        items: [advisoryItem()],
        runtime_mode: "live",
      },
    });
    mockCopilotApi.listRecommendations.mockResolvedValue({
      data: {
        items: [],
        schema_version: "2026-04-18.wave4",
        supports_non_web_delivery: true,
      },
    });
    mockCopilotApi.resolve.mockResolvedValue({
      data: copilotResolution({
        action: {
          adapter: "market.listings.publish",
          aggregate_ref: "listing-1",
          command_name: "market.listings.publish",
          confirmation_required: true,
          mutation_scope: "marketplace.listings",
          payload: { listing_id: "listing-1" },
          target: {
            aggregate_id: "listing-1",
            aggregate_type: "listing",
            label: "Cassava Lot A",
          },
        },
        confirmation_copy: "Confirm publication for listing Cassava Lot A.",
        explanation: "Publishing exposes the draft listing to buyers.",
        intent: "market.listings.publish",
        status: "confirmation_required",
        summary: "AgroGuide can publish the listing now.",
      }),
    });
    mockCopilotApi.executeAction.mockResolvedValue({
      data: copilotExecutionResult({
        adapter: "market.listings.publish",
        human_handoff: {
          queue_label: "AgroGuide operator queue",
          reason_code: "human_handoff_requested",
          required: true,
          reviewer_roles: ["advisor", "ops"],
        },
        intent: "market.listings.publish",
        notification: {
          delivery_state: "action_required",
          error_code: null,
          fallback_channel: "whatsapp",
          fallback_reason: "manual_escalation",
          notification_id: "copilot-res-1",
          retryable: false,
          schema_version: "2026-04-18.wave4",
        },
        status: "escalated",
        summary: "AgroGuide created a human handoff instead of executing the action.",
      }),
    });

    render(<AgroGuideAssistantPanel onClose={() => undefined} open />);

    const input = screen.getByLabelText("Ask AgroGuide a question");
    fireEvent.change(input, { target: { value: "Publish my cassava listing now" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(mockCopilotApi.resolve).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Copilot action ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm Cassava Lot A" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Escalate" }));

    await waitFor(() => expect(mockCopilotApi.executeAction).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText(/AgroGuide created a human handoff instead of executing the action/i),
    ).toBeInTheDocument();
  });

  it("confirms and executes proactive recommendations through the copilot action seam", async () => {
    mockAdvisoryApi.listConversations.mockResolvedValue({
      data: {
        items: [advisoryItem()],
        runtime_mode: "live",
      },
    });
    mockCopilotApi.listRecommendations
      .mockResolvedValueOnce({
        data: {
          items: [recommendationItem()],
          schema_version: "2026-04-18.wave4",
          supports_non_web_delivery: true,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [],
          schema_version: "2026-04-18.wave4",
          supports_non_web_delivery: true,
        },
      });
    mockCopilotApi.executeRecommendation.mockResolvedValue({
      data: { status: "accepted" },
    });

    render(<AgroGuideAssistantPanel onClose={() => undefined} open />);

    expect(await screen.findByText("Publish your cassava listing")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Publish listing" }));

    expect(
      await screen.findByRole("button", { name: "Confirm Publish listing" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Publish listing" }));

    await waitFor(() => {
      expect(mockCopilotApi.executeRecommendation).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.queryByText("Publish your cassava listing")).not.toBeInTheDocument();
    });
  });
});

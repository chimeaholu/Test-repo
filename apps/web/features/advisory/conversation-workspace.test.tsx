import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

const { mockAdvisoryApi, mockRecordTelemetry, mockUseAppState } = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockRecordTelemetry: vi.fn(),
  mockAdvisoryApi: {
    listConversations: vi.fn(),
  },
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/advisory", () => ({
  advisoryApi: mockAdvisoryApi,
}));

vi.mock("@/lib/telemetry/client", () => ({
  recordTelemetry: (...args: unknown[]) => mockRecordTelemetry(...args),
}));

import { AdvisoryConversationWorkspace } from "@/features/advisory/conversation-workspace";

describe("advisory conversation workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppState.mockReturnValue({
      session: {
        actor: {
          actor_id: "actor-advisor",
          display_name: "Advisor Ama",
          email: "advisor@example.com",
          role: "advisor",
          country_code: "GH",
          locale: "en-NG",
          membership: {
            organization_id: "org-1",
            organization_name: "Org 1",
            role: "advisor",
          },
        },
        consent: {
          actor_id: "actor-advisor",
          country_code: "GH",
          state: "consent_granted",
          policy_version: "2026.04.n4",
          scope_ids: ["identity.core", "workflow.audit"],
          channel: "pwa",
          captured_at: "2026-04-18T00:00:00.000Z",
          revoked_at: null,
        },
        available_roles: ["advisor"],
      },
      traceId: "trace-advisory",
    });
    mockAdvisoryApi.listConversations.mockResolvedValue({
      data: {
        runtime_mode: "fallback",
        items: [
          {
            advisory_request_id: "adv-1",
            advisory_conversation_id: "conversation-1",
            actor_id: "actor-advisor",
            country_code: "GH",
            locale: "en-GH",
            topic: "Waterlogged maize after heavy rain",
            question_text: "What should be checked first?",
            response_text: "Check drainage before recommending inputs.",
            status: "hitl_required",
            confidence_band: "medium",
            confidence_score: 0.58,
            grounded: true,
            citations: [
              {
                source_id: "src-1",
                title: "Drainage checklist",
                source_type: "extension",
                locale: "en-GH",
                country_code: "GH",
                citation_url: "https://example.com",
                published_at: "2026-04-18T00:00:00.000Z",
                excerpt: "Drainage should be checked before treatment.",
                method_tag: "field-drainage-triage",
              },
            ],
            transcript_entries: [
              {
                speaker: "user",
                message: "What should be checked first?",
                captured_at: "2026-04-18T00:00:00.000Z",
                channel: "pwa",
              },
            ],
            reviewer_decision: {
              advisory_request_id: "adv-1",
              decision_id: "review-1",
              actor_id: "reviewer-1",
              actor_role: "advisor",
              outcome: "hitl_required",
              reason_code: "policy_sensitive",
              note: "Hold for human review.",
              transcript_link: "advisory://review-1",
              policy_context: {
                matched_policy: "crop_health.treatment_guardrail",
                confidence_threshold: 0.75,
                policy_sensitive: true,
              },
              created_at: "2026-04-18T00:00:00.000Z",
              schema_version: "2026-04-18.wave4",
            },
            source_ids: ["src-1"],
            model_name: "agro-advisor",
            model_version: "n4-preview",
            correlation_id: "corr-1",
            request_id: "req-1",
            delivered_at: null,
            created_at: "2026-04-18T00:00:00.000Z",
            schema_version: "2026-04-18.wave4",
          },
        ],
        schema_version: "2026-04-18.wave4",
      },
    });
  });

  it("renders reviewer state, locale fallback, and citation drawer", async () => {
    render(<AdvisoryConversationWorkspace surface="advisor" />);

    expect(await screen.findByText("Review the next request and send practical guidance")).toBeInTheDocument();
    expect(screen.getByText(/closest supported advisory language/i)).toBeInTheDocument();
    expect(screen.getByText("A person still needs to confirm this")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open source details" }));
    expect(screen.getByText("Drainage checklist")).toBeInTheDocument();
    expect(mockRecordTelemetry).toHaveBeenCalled();
  });
});

import type {
  CopilotExecutionDecision,
  CopilotExecutionResult,
  CopilotResolution,
  CopilotResolveInput,
  CopilotRecommendation,
  CopilotRecommendationCollection,
  IdentitySession,
  ResponseEnvelope,
} from "@agrodomain/contracts";

import type { CommandResultEnvelope } from "../api-client";
import { requestJson, responseEnvelope, sendCommand } from "../api-client";

export const copilotApi = {
  async listRecommendations(
    traceId: string,
  ): Promise<ResponseEnvelope<CopilotRecommendationCollection>> {
    return requestJson<CopilotRecommendationCollection>(
      "/api/v1/copilot/recommendations",
      { method: "GET" },
      traceId,
      true,
    );
  },

  async resolve(
    input: CopilotResolveInput,
    traceId: string,
  ): Promise<ResponseEnvelope<CopilotResolution>> {
    return requestJson<CopilotResolution>(
      "/api/v1/copilot/resolve",
      {
        body: JSON.stringify(input),
        method: "POST",
      },
      traceId,
      true,
    );
  },

  async executeAction(params: {
    decision: CopilotExecutionDecision;
    note?: string | null;
    resolution: CopilotResolution;
    traceId: string;
  }): Promise<ResponseEnvelope<CopilotExecutionResult>> {
    const { action } = params.resolution;
    if (!action) {
      throw new Error("copilot_resolution_missing_action");
    }

    return requestJson<CopilotExecutionResult>(
      "/api/v1/copilot/execute",
      {
        body: JSON.stringify({
          resolution_id: params.resolution.resolution_id,
          intent: params.resolution.intent,
          adapter: action.adapter,
          route_path: params.resolution.route_path,
          decision: params.decision,
          payload: action.payload,
          note: params.note ?? null,
        }),
        method: "POST",
      },
      params.traceId,
      true,
    );
  },

  async executeRecommendation(params: {
    recommendation: CopilotRecommendation;
    session: IdentitySession;
    traceId: string;
  }): Promise<
    ResponseEnvelope<
      CommandResultEnvelope<Record<string, unknown>> | Record<string, unknown>
    >
  > {
    const { action } = params.recommendation;

    if (action.kind === "workflow_command") {
      return sendCommand(
        {
          actorId: params.session.actor.actor_id,
          aggregateRef: action.aggregate_ref,
          commandName: action.command_name ?? "copilot.missing_command",
          countryCode: params.session.actor.country_code,
          dataCheckIds: action.data_check_ids,
          input: action.payload as Record<string, unknown>,
          journeyIds: action.journey_ids,
          mutationScope: action.mutation_scope ?? "copilot.unspecified",
          traceId: params.traceId,
        },
        params.traceId,
      );
    }

    if (action.kind === "transport_endpoint" && action.transport_endpoint) {
      return requestJson<Record<string, unknown>>(
        action.transport_endpoint.path,
        {
          body: JSON.stringify(action.payload),
          method: action.transport_endpoint.method,
        },
        params.traceId,
        true,
      );
    }

    if (action.kind === "open_route") {
      return responseEnvelope(
        { action_kind: action.kind, route: action.route ?? null },
        params.traceId,
      );
    }

    throw new Error("unsupported_copilot_action");
  },
};

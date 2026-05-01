"use client";

import type {
  AgroIntelligenceEntityCollection,
  AgroIntelligenceEntityDetail,
  AgroIntelligenceOverview,
  AgroIntelligenceQueueCollection,
  AgroIntelligenceResolutionRun,
  AgroIntelligenceVerificationDecisionResult,
  ResponseEnvelope,
} from "@agrodomain/contracts";
import {
  agroIntelligenceEntityCollectionSchema,
  agroIntelligenceEntityDetailSchema,
  agroIntelligenceOverviewSchema,
  agroIntelligenceQueueCollectionSchema,
  agroIntelligenceResolutionRunSchema,
  agroIntelligenceVerificationDecisionResultSchema,
} from "@agrodomain/contracts";

import { requestJson, responseEnvelope } from "../api-client";

type EntityListOptions = {
  entityType?: string;
  lifecycleState?: string;
  onlyBuyers?: boolean;
  q?: string;
  sourceTier?: string;
  trustTier?: string;
};

function buildQuery(options: Record<string, string | boolean | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) {
      params.set(key, value);
    } else if (typeof value === "boolean" && value) {
      params.set(key, "true");
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const agroIntelligenceApi = {
  async getOverview(
    traceId: string,
    options?: { sync?: boolean },
  ): Promise<ResponseEnvelope<AgroIntelligenceOverview>> {
    const response = await requestJson<unknown>(
      `/api/v1/agro-intelligence/overview${buildQuery({ sync: options?.sync })}`,
      { method: "GET" },
      traceId,
      true,
    );
    return responseEnvelope(agroIntelligenceOverviewSchema.parse(response.data), traceId);
  },

  async listEntities(
    traceId: string,
    options?: EntityListOptions,
  ): Promise<ResponseEnvelope<AgroIntelligenceEntityCollection>> {
    const response = await requestJson<unknown>(
      `/api/v1/agro-intelligence/entities${buildQuery({
        q: options?.q,
        entity_type: options?.entityType,
        trust_tier: options?.trustTier,
        lifecycle_state: options?.lifecycleState,
        source_tier: options?.sourceTier,
        only_buyers: options?.onlyBuyers,
      })}`,
      { method: "GET" },
      traceId,
      true,
    );
    return responseEnvelope(
      agroIntelligenceEntityCollectionSchema.parse(response.data),
      traceId,
    );
  },

  async listBuyers(
    traceId: string,
    options?: { q?: string; trustTier?: string },
  ): Promise<ResponseEnvelope<AgroIntelligenceEntityCollection>> {
    const response = await requestJson<unknown>(
      `/api/v1/agro-intelligence/buyers${buildQuery({
        q: options?.q,
        trust_tier: options?.trustTier,
      })}`,
      { method: "GET" },
      traceId,
      true,
    );
    return responseEnvelope(
      agroIntelligenceEntityCollectionSchema.parse(response.data),
      traceId,
    );
  },

  async getEntity(
    entityId: string,
    traceId: string,
  ): Promise<ResponseEnvelope<AgroIntelligenceEntityDetail>> {
    const response = await requestJson<unknown>(
      `/api/v1/agro-intelligence/entities/${entityId}`,
      { method: "GET" },
      traceId,
      true,
    );
    return responseEnvelope(
      agroIntelligenceEntityDetailSchema.parse(response.data),
      traceId,
    );
  },

  async getVerificationQueue(
    traceId: string,
  ): Promise<ResponseEnvelope<AgroIntelligenceQueueCollection>> {
    const response = await requestJson<unknown>(
      "/api/v1/agro-intelligence/workspace/queue",
      { method: "GET" },
      traceId,
      true,
    );
    return responseEnvelope(
      agroIntelligenceQueueCollectionSchema.parse(response.data),
      traceId,
    );
  },

  async runResolution(
    traceId: string,
  ): Promise<ResponseEnvelope<AgroIntelligenceResolutionRun>> {
    const response = await requestJson<unknown>(
      "/api/v1/agro-intelligence/workspace/resolution-run",
      { method: "POST", body: JSON.stringify({}) },
      traceId,
      true,
    );
    return responseEnvelope(
      agroIntelligenceResolutionRunSchema.parse(response.data),
      traceId,
    );
  },

  async applyVerificationDecision(
    params: { action: "approve" | "reject" | "mark_stale"; entityId: string; traceId: string },
  ): Promise<ResponseEnvelope<AgroIntelligenceVerificationDecisionResult>> {
    const response = await requestJson<unknown>(
      `/api/v1/agro-intelligence/workspace/queue/${params.entityId}/decision`,
      {
        method: "POST",
        body: JSON.stringify({ action: params.action }),
      },
      params.traceId,
      true,
    );
    return responseEnvelope(
      agroIntelligenceVerificationDecisionResultSchema.parse(response.data),
      params.traceId,
    );
  },
};

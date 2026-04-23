/**
 * Advisory domain service — typed functions for advisory requests and
 * conversation reads.
 */

import type { z } from "zod";
import {
  advisoryConversationCollectionSchema,
  type advisoryResponseSchema,
} from "@agrodomain/contracts";

import { api } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdvisoryConversationCollection = z.infer<typeof advisoryConversationCollectionSchema>;
type AdvisoryResponse = z.infer<typeof advisoryResponseSchema>;

type CallOptions = {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  noAuth?: boolean;
  params?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * List advisory requests, optionally filtered by conversation and locale.
 *
 * Backend: GET /api/v1/advisory/requests
 */
export async function getAdvisoryRequests(
  params?: { conversation_id?: string; locale?: string },
  options?: CallOptions,
): Promise<AdvisoryConversationCollection> {
  return api.get<AdvisoryConversationCollection>(
    "/api/v1/advisory/requests",
    {
      ...options,
      params: {
        ...options?.params,
        ...(params?.conversation_id ? { conversation_id: params.conversation_id } : {}),
        ...(params?.locale ? { locale: params.locale } : {}),
      },
      schema: advisoryConversationCollectionSchema,
    },
  );
}

/**
 * List advisory conversations, optionally filtered by conversation and locale.
 *
 * Backend: GET /api/v1/advisory/conversations
 */
export async function getAdvisoryConversations(
  params?: { conversation_id?: string; locale?: string },
  options?: CallOptions,
): Promise<AdvisoryConversationCollection> {
  return api.get<AdvisoryConversationCollection>(
    "/api/v1/advisory/conversations",
    {
      ...options,
      params: {
        ...options?.params,
        ...(params?.conversation_id ? { conversation_id: params.conversation_id } : {}),
        ...(params?.locale ? { locale: params.locale } : {}),
      },
      schema: advisoryConversationCollectionSchema,
    },
  );
}

/**
 * Get a single advisory request by ID.
 *
 * Backend: GET /api/v1/advisory/requests/:advisoryRequestId
 */
export async function getAdvisoryRequest(
  advisoryRequestId: string,
  options?: CallOptions,
): Promise<AdvisoryResponse> {
  return api.get<AdvisoryResponse>(
    `/api/v1/advisory/requests/${advisoryRequestId}`,
    options,
  );
}

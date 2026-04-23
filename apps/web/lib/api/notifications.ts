/**
 * Notifications domain service — typed function for the notification center.
 */

import { api } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationCenterResponse = {
  generated_at: string;
  unread_count: number;
  items: Array<{
    notification_id: string;
    kind: string;
    title: string;
    body: string;
    delivery_state: string;
    route: string;
    ack_state: string;
    created_at: string | null;
    metadata?: Record<string, unknown>;
  }>;
};

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
 * Fetch the notification center for the authenticated actor.
 *
 * Backend: GET /api/v1/notifications/center
 */
export async function getNotificationCenter(
  options?: CallOptions,
): Promise<NotificationCenterResponse> {
  return api.get<NotificationCenterResponse>(
    "/api/v1/notifications/center",
    options,
  );
}

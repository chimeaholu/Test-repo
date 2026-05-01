import { describe, expect, it } from "vitest";

import {
  groupNotifications,
  relativeDayLabel,
  unreadNotificationCount,
  type FeedNotification,
} from "@/features/notifications/model";

function note(id: string, createdAt: string, read = false): FeedNotification {
  return {
    schema_version: "2026-04-18.wave1",
    notification_id: id,
    module: "system",
    category: "system",
    lifecycle_state: "info",
    urgency: "routine",
    title: "Title",
    body: "Body",
    created_at: createdAt,
    read,
    read_at: read ? createdAt : null,
    expires_at: null,
    next_action_copy: null,
    listing_id: null,
    thread_id: null,
    escrow_id: null,
    action: {
      label: "Open",
      href: "/app/profile",
    },
    dispatch_plan: {
      schema_version: "2026-04-18.wave1",
      notification_id: id,
      template_key: "system.test",
      dedupe_key: id,
      queue_state: "dispatched",
      preferred_channels: ["in_app"],
      fallback_channels: [],
      expires_at: null,
      escalate_after: null,
      payload: {},
    },
  };
}

describe("notification model helpers", () => {
  it("labels relative day groups", () => {
    expect(relativeDayLabel("2026-04-24T04:00:00.000Z", new Date("2026-04-24T12:00:00.000Z"))).toBe("TODAY");
    expect(relativeDayLabel("2026-04-23T04:00:00.000Z", new Date("2026-04-24T12:00:00.000Z"))).toBe("YESTERDAY");
  });

  it("groups notifications by day label", () => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(8, 0, 0, 0);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(8, 0, 0, 0);

    const grouped = groupNotifications([
      note("a", today.toISOString()),
      note("b", yesterday.toISOString()),
    ]);

    expect(grouped.map((item) => item.label)).toEqual(["TODAY", "YESTERDAY"]);
  });

  it("counts unread notifications correctly", () => {
    expect(unreadNotificationCount([
      note("a", "2026-04-24T08:00:00.000Z"),
      note("b", "2026-04-24T08:00:00.000Z", true),
    ])).toBe(1);
  });
});

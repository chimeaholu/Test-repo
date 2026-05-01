import { describe, expect, it } from "vitest";

import {
  groupNotifications,
  relativeDayLabel,
  unreadNotificationCount,
  type FeedNotification,
} from "@/features/notifications/model";

function note(id: string, createdAt: string, read = false): FeedNotification {
  return {
    id,
    category: "system",
    title: "Title",
    body: "Body",
    actionLabel: "Open",
    href: "/app/profile",
    createdAt,
    read,
  };
}

describe("notification model helpers", () => {
  it("labels relative day groups", () => {
    expect(relativeDayLabel("2026-04-24T04:00:00.000Z", new Date("2026-04-24T12:00:00.000Z"))).toBe("TODAY");
    expect(relativeDayLabel("2026-04-23T04:00:00.000Z", new Date("2026-04-24T12:00:00.000Z"))).toBe("YESTERDAY");
  });

  it("groups notifications by day label", () => {
    const grouped = groupNotifications([
      note("a", "2026-04-24T08:00:00.000Z"),
      note("b", "2026-04-23T08:00:00.000Z"),
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

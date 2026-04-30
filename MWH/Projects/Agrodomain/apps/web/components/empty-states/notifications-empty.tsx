import { EmptyState } from "@/components/ui/empty-state";
import { NotificationIcon } from "@/components/icons";

export function NotificationsEmpty() {
  return (
    <EmptyState
      icon={<NotificationIcon size={48} />}
      title="You're all caught up"
      description="New notifications about your orders, payments, and weather alerts will show up here."
    />
  );
}

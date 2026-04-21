from agro_v2.frontend_notifications_center import FrontendNotificationsCenter
from agro_v2.mobile_api_profile import (
    MobileApiProfile,
    MobileApiProfileRegistry,
    PaginationPolicy,
    PayloadBudget,
)
from agro_v2.notification_broker import (
    BrokerChannel,
    NotificationBroker,
    NotificationBrokerRequest,
    NotificationIntentType,
    NotificationRecipientProfile,
)


def test_notifications_center_projects_deep_links_from_broker_plans():
    profiles = MobileApiProfileRegistry()
    profiles.register(
        MobileApiProfile(
            version="mobile.v1",
            payload_budgets=(PayloadBudget("notifications.push.deliver", 2048),),
            pagination=PaginationPolicy(default_page_size=20, max_page_size=50),
            resumable_operations=(),
        )
    )
    broker = NotificationBroker(profile_registry=profiles)
    plan = broker.plan(
        NotificationBrokerRequest(
            notification_id="notif-18",
            intent_type=NotificationIntentType.LISTING_ALERT,
            recipient=NotificationRecipientProfile(
                contact_id="buyer-18",
                locale="en-GH",
                phone_number="+233555000018",
                preferred_channels=(BrokerChannel.WHATSAPP, BrokerChannel.SMS),
            ),
            body="A new cocoa lot is ready.",
            profile_version="mobile.v1",
        )
    )
    surface = FrontendNotificationsCenter().build_surface(
        plan_routes=((plan, "/app/market/listings/listing-18"),),
    )
    audit = FrontendNotificationsCenter().audit(surface)

    assert surface.items[0].channel_label == "whatsapp"
    assert audit.passed is True

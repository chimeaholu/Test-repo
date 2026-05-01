from datetime import date

import pytest

from app.db.repositories.transport import TransportRepository
from app.modules.transport.runtime import TransportRuntime
from app.services.commands.errors import CommandRejectedError


def test_transport_runtime_creates_load_for_shipper_roles(session) -> None:
    repository = TransportRepository(session)
    runtime = TransportRuntime(repository)

    load = runtime.create_load(
        actor_id="actor-farmer-gh-ama",
        actor_role="farmer",
        country_code="GH",
        origin_location="Tamale, GH",
        destination_location="Kumasi, GH",
        commodity="Tomatoes",
        weight_tons=4.5,
        vehicle_type_required="refrigerated_truck",
        pickup_date=date(2026, 4, 26),
        delivery_deadline=date(2026, 4, 27),
        price_offer=780,
        price_currency="ghs",
    )
    session.commit()

    assert load.status == "posted"
    assert load.price_currency == "GHS"


def test_transport_runtime_blocks_invalid_pickup_and_delivery_window(session) -> None:
    runtime = TransportRuntime(TransportRepository(session))

    with pytest.raises(CommandRejectedError) as exc:
        runtime.create_load(
            actor_id="actor-farmer-gh-ama",
            actor_role="farmer",
            country_code="GH",
            origin_location="Tamale, GH",
            destination_location="Kumasi, GH",
            commodity="Tomatoes",
            weight_tons=4.5,
            vehicle_type_required="refrigerated_truck",
            pickup_date=date(2026, 4, 28),
            delivery_deadline=date(2026, 4, 27),
            price_offer=780,
            price_currency="GHS",
        )

    assert exc.value.reason_code == "delivery_deadline_before_pickup_date"


def test_transport_runtime_assignment_requires_transporter_role(session) -> None:
    repository = TransportRepository(session)
    runtime = TransportRuntime(repository)
    load = repository.create_load(
        load_id="load-001",
        poster_actor_id="actor-farmer-gh-ama",
        country_code="GH",
        origin_location="Tamale, GH",
        destination_location="Kumasi, GH",
        commodity="Yam",
        weight_tons=7,
        vehicle_type_required="flatbed",
        pickup_date=date(2026, 4, 26),
        delivery_deadline=date(2026, 4, 29),
        price_offer=980,
        price_currency="GHS",
    )
    session.commit()

    with pytest.raises(CommandRejectedError) as exc:
        runtime.assign_load(
            actor_id="actor-buyer-gh-ama",
            actor_role="buyer",
            load=load,
            vehicle_info={"plate_number": "GR-1234-26"},
            location_lat=5.6037,
            location_lng=-0.187,
            notes="Ready to dispatch",
        )

    assert exc.value.reason_code == "transport_load_assign_forbidden"


def test_transport_runtime_progresses_shipment_to_delivery(session) -> None:
    repository = TransportRepository(session)
    runtime = TransportRuntime(repository)
    load = repository.create_load(
        load_id="load-002",
        poster_actor_id="actor-farmer-gh-ama",
        country_code="GH",
        origin_location="Tamale, GH",
        destination_location="Accra, GH",
        commodity="Maize",
        weight_tons=10,
        vehicle_type_required="truck",
        pickup_date=date(2026, 4, 26),
        delivery_deadline=date(2026, 4, 30),
        price_offer=1200,
        price_currency="GHS",
    )
    assigned = runtime.assign_load(
        actor_id="actor-transporter-gh-yaw",
        actor_role="transporter",
        load=load,
        vehicle_info={"plate_number": "AS-3001-26"},
        location_lat=5.6037,
        location_lng=-0.187,
        notes="Assigned",
    )
    in_transit = runtime.log_operational_event(
        actor_id="actor-transporter-gh-yaw",
        actor_role="transporter",
        load=assigned.load,
        shipment=assigned.shipment,
        event_type="picked_up",
        location_lat=9.4075,
        location_lng=-0.8533,
        notes="Loaded and departed",
    )
    delivered = runtime.deliver_shipment(
        actor_id="actor-transporter-gh-yaw",
        actor_role="transporter",
        load=in_transit.load,
        shipment=in_transit.shipment,
        proof_of_delivery_url="https://cdn.example.com/proof/load-002.jpg",
        location_lat=5.6037,
        location_lng=-0.187,
        notes="Receiver signed",
    )
    session.commit()

    assert delivered.load.status == "delivered"
    assert delivered.shipment.status == "delivered"
    assert delivered.shipment.proof_of_delivery_url == "https://cdn.example.com/proof/load-002.jpg"
    assert delivered.event.event_type == "delivered"

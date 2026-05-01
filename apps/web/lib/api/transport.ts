import type { ResponseEnvelope } from "@agrodomain/contracts";

import { requestJson } from "../api-client";

export type TransportRouteRead = {
  provider: string;
  provider_mode: string;
  distance_km: number;
  duration_minutes: number;
  eta_at: string;
  corridor_code: string;
  degraded_reasons: string[];
};

export type TransportMatchRead = {
  actor_id: string;
  display_name: string;
  email: string;
  availability: string;
  availability_reason: string;
  score: number;
  capacity_tons: number;
  vehicle_label: string;
  estimated_distance_km: number;
  estimated_quote: number;
  reliability_score: number;
  corridor_fit_score: number;
  capacity_fit_score: number;
  proximity_score: number;
  graph_context_used: boolean;
  fallback_strategy: string;
};

export type TransportLoadRead = {
  load_id: string;
  poster_actor_id: string;
  country_code: string;
  origin_location: string;
  destination_location: string;
  commodity: string;
  weight_tons: number;
  vehicle_type_required: string;
  pickup_date: string;
  delivery_deadline: string;
  price_offer: number;
  price_currency: string;
  status: string;
  assigned_transporter_actor_id: string | null;
  shipment_id: string | null;
  created_at?: string;
  updated_at?: string;
  route: TransportRouteRead;
};

export type TransportShipmentRead = {
  shipment_id: string;
  load_id: string;
  poster_actor_id: string;
  transporter_actor_id: string;
  country_code: string;
  status: string;
  vehicle_info: Record<string, unknown>;
  pickup_time?: string | null;
  delivery_time?: string | null;
  proof_of_delivery_url?: string | null;
  created_at?: string;
  updated_at?: string;
  route: TransportRouteRead;
  load: TransportLoadRead;
  events: Array<{
    event_id: string;
    shipment_id: string;
    actor_id: string;
    event_type: string;
    timestamp: string | null;
    notes: string | null;
  }>;
};

export type TransportLoadCollection = {
  items: TransportLoadRead[];
};

export type TransportShipmentCollection = {
  items: TransportShipmentRead[];
};

export type DispatchBoardRead = {
  summary: {
    open_loads: number;
    assigned_shipments: number;
    at_risk_shipments: number;
    fallback_route_items: number;
  };
  items: Array<{
    load: TransportLoadRead;
    shipment: TransportShipmentRead | null;
    top_matches: TransportMatchRead[];
    exception_state: string;
    exception_reasons: string[];
  }>;
};

export const transportApi = {
  async listLoads(
    traceId: string,
    params?: { mine?: boolean; status?: string },
  ): Promise<ResponseEnvelope<TransportLoadCollection>> {
    const search = new URLSearchParams();
    if (params?.mine) {
      search.set("mine", "true");
    }
    if (params?.status) {
      search.set("status", params.status);
    }
    const suffix = search.size ? `?${search.toString()}` : "";
    return requestJson<TransportLoadCollection>(`/api/v1/transport/loads${suffix}`, { method: "GET" }, traceId, true);
  },

  async getLoad(loadId: string, traceId: string): Promise<ResponseEnvelope<TransportLoadRead>> {
    return requestJson<TransportLoadRead>(`/api/v1/transport/loads/${loadId}`, { method: "GET" }, traceId, true);
  },

  async createLoad(
    payload: {
      commodity: string;
      deliveryDeadline: string;
      destinationLocation: string;
      pickupDate: string;
      originLocation: string;
      priceCurrency: string;
      priceOffer: number;
      vehicleTypeRequired: string;
      weightTons: number;
    },
    traceId: string,
  ): Promise<ResponseEnvelope<TransportLoadRead>> {
    return requestJson<TransportLoadRead>(
      "/api/v1/transport/loads",
      {
        method: "POST",
        body: JSON.stringify({
          commodity: payload.commodity,
          delivery_deadline: payload.deliveryDeadline,
          destination_location: payload.destinationLocation,
          origin_location: payload.originLocation,
          pickup_date: payload.pickupDate,
          price_currency: payload.priceCurrency,
          price_offer: payload.priceOffer,
          vehicle_type_required: payload.vehicleTypeRequired,
          weight_tons: payload.weightTons,
        }),
      },
      traceId,
      true,
    );
  },

  async getDispatchBoard(traceId: string): Promise<ResponseEnvelope<DispatchBoardRead>> {
    return requestJson<DispatchBoardRead>("/api/v1/transport/dispatch/board", { method: "GET" }, traceId, true);
  },

  async dispatchAssign(
    payload: {
      loadId: string;
      transporterActorId: string;
      vehicleInfo: Record<string, unknown>;
      notes?: string;
    },
    traceId: string,
  ): Promise<ResponseEnvelope<TransportShipmentRead>> {
    return requestJson<TransportShipmentRead>(
      `/api/v1/transport/loads/${payload.loadId}/dispatch-assign`,
      {
        method: "POST",
        body: JSON.stringify({
          transporter_actor_id: payload.transporterActorId,
          vehicle_info: payload.vehicleInfo,
          notes: payload.notes ?? null,
        }),
      },
      traceId,
      true,
    );
  },

  async reassignShipment(
    payload: {
      shipmentId: string;
      transporterActorId: string;
      vehicleInfo: Record<string, unknown>;
      notes?: string;
    },
    traceId: string,
  ): Promise<ResponseEnvelope<TransportShipmentRead>> {
    return requestJson<TransportShipmentRead>(
      `/api/v1/transport/shipments/${payload.shipmentId}/reassign`,
      {
        method: "POST",
        body: JSON.stringify({
          transporter_actor_id: payload.transporterActorId,
          vehicle_info: payload.vehicleInfo,
          notes: payload.notes ?? null,
        }),
      },
      traceId,
      true,
    );
  },

  async assignLoad(
    payload: {
      loadId: string;
      vehicleInfo: Record<string, unknown>;
      locationLat?: number;
      locationLng?: number;
      notes?: string;
    },
    traceId: string,
  ): Promise<ResponseEnvelope<TransportShipmentRead>> {
    return requestJson<TransportShipmentRead>(
      `/api/v1/transport/loads/${payload.loadId}/assign`,
      {
        method: "POST",
        body: JSON.stringify({
          vehicle_info: payload.vehicleInfo,
          location_lat: payload.locationLat ?? null,
          location_lng: payload.locationLng ?? null,
          notes: payload.notes ?? null,
        }),
      },
      traceId,
      true,
    );
  },

  async listShipments(
    traceId: string,
    params?: { status?: string },
  ): Promise<ResponseEnvelope<TransportShipmentCollection>> {
    const search = new URLSearchParams();
    if (params?.status) {
      search.set("status", params.status);
    }
    const suffix = search.size ? `?${search.toString()}` : "";
    return requestJson<TransportShipmentCollection>(`/api/v1/transport/shipments${suffix}`, { method: "GET" }, traceId, true);
  },

  async getShipment(shipmentId: string, traceId: string): Promise<ResponseEnvelope<TransportShipmentRead>> {
    return requestJson<TransportShipmentRead>(`/api/v1/transport/shipments/${shipmentId}`, { method: "GET" }, traceId, true);
  },

  async createShipmentEvent(
    payload: {
      shipmentId: string;
      eventType: string;
      checkpointLabel?: string;
      delayMinutes?: number | null;
      exceptionCode?: string | null;
      locationLat?: number;
      locationLng?: number;
      notes?: string | null;
      severity?: "low" | "medium" | "high" | null;
    },
    traceId: string,
  ): Promise<ResponseEnvelope<TransportShipmentRead>> {
    return requestJson<TransportShipmentRead>(
      `/api/v1/transport/shipments/${payload.shipmentId}/events`,
      {
        method: "POST",
        body: JSON.stringify({
          checkpoint_label: payload.checkpointLabel ?? null,
          delay_minutes: payload.delayMinutes ?? null,
          event_type: payload.eventType,
          exception_code: payload.exceptionCode ?? null,
          location_lat: payload.locationLat ?? null,
          location_lng: payload.locationLng ?? null,
          notes: payload.notes ?? null,
          severity: payload.severity ?? null,
        }),
      },
      traceId,
      true,
    );
  },

  async deliverShipment(
    payload: {
      shipmentId: string;
      damageReported?: boolean;
      locationLat?: number;
      locationLng?: number;
      notes?: string | null;
      proofOfDeliveryUrl: string;
      recipientName?: string | null;
    },
    traceId: string,
  ): Promise<ResponseEnvelope<TransportShipmentRead>> {
    return requestJson<TransportShipmentRead>(
      `/api/v1/transport/shipments/${payload.shipmentId}/deliver`,
      {
        method: "POST",
        body: JSON.stringify({
          damage_reported: payload.damageReported ?? false,
          location_lat: payload.locationLat ?? null,
          location_lng: payload.locationLng ?? null,
          notes: payload.notes ?? null,
          proof_of_delivery_url: payload.proofOfDeliveryUrl,
          recipient_name: payload.recipientName ?? null,
        }),
      },
      traceId,
      true,
    );
  },
};

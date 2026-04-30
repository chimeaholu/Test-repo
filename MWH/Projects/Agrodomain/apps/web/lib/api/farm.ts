import type { ResponseEnvelope } from "@agrodomain/contracts";

import { climateApi } from "./climate";
import {
  readJson,
  readSession,
  requestJson,
  responseEnvelope,
  unwrapCollection,
  writeJson,
} from "../api-client";

type FarmStatus = "active" | "fallow" | "preparing";
type CropCycleStatus = "planned" | "active" | "harvested" | "failed";
type ActivityType =
  | "planting"
  | "weeding"
  | "fertilizing"
  | "spraying"
  | "irrigating"
  | "harvesting"
  | "scouting"
  | "other";
type InputType = "seed" | "fertilizer" | "pesticide" | "herbicide" | "fuel" | "other";

const FARM_LOCAL_STATE_KEY = "agrodomain.farm.workspace.v1";

export interface BoundaryPoint {
  lat: number;
  lng: number;
}

export interface FarmSummary {
  countryCode: string;
  currentSeason: string;
  district: string;
  farmId: string;
  farmName: string;
  hectares: number;
  latitude: number;
  longitude: number;
  mode: "live" | "reference";
  primaryCrop: string;
  region: string;
}

export interface FarmField {
  activityCount: number;
  areaHectares: number;
  boundary: BoundaryPoint[];
  district: string;
  expectedHarvestDate: string;
  farmId: string;
  fieldId: string;
  healthSummary: string;
  irrigationType: string;
  lastActivityAt: string;
  lastActivityType: ActivityType;
  name: string;
  nextTask: string;
  plantingDate: string;
  soilType: string;
  status: FarmStatus;
  currentCrop: string;
  variety: string;
}

export interface FarmActivity {
  activityId: string;
  activityType: ActivityType;
  cost: number;
  date: string;
  description: string;
  farmId: string;
  fieldId: string;
  inputsUsed: string[];
  laborHours: number;
  notes: string;
  photoLabel: string | null;
  source: "live" | "reference";
}

export interface FarmInput {
  cost: number;
  expiryDate: string | null;
  farmId: string;
  inputId: string;
  inputType: InputType;
  name: string;
  purchaseDate: string;
  quantity: number;
  reorderLevel: number;
  supplier: string;
  unit: string;
}

export interface CropCycle {
  cropCycleId: string;
  cropType: string;
  farmId: string;
  fieldId: string;
  plantingDate: string;
  revenue: number | null;
  status: CropCycleStatus;
  variety: string;
  yieldTons: number | null;
  harvestDate: string | null;
}

export interface FarmWeatherWidget {
  alertSummary: string;
  rainfallMm: number | null;
  riskLabel: string;
  soilMoisturePct: number | null;
  sourceLabel: string;
  temperatureC: number | null;
}

export interface FarmWorkspace {
  activities: FarmActivity[];
  cropCycles: CropCycle[];
  farm: FarmSummary;
  fields: FarmField[];
  inputs: FarmInput[];
  weather: FarmWeatherWidget;
}

export interface AddFieldInput {
  areaHectares: number;
  boundary: BoundaryPoint[];
  currentCrop: string;
  district: string;
  expectedHarvestDate: string;
  irrigationType: string;
  name: string;
  plantingDate: string;
  soilType: string;
  variety: string;
}

export interface LogActivityInput {
  activityType: ActivityType;
  cost: number;
  date: string;
  description: string;
  fieldId: string;
  inputsUsed: string[];
  laborHours: number;
  notes: string;
  photoLabel?: string | null;
}

export interface AddInputInput {
  cost: number;
  expiryDate?: string | null;
  inputType: InputType;
  name: string;
  purchaseDate: string;
  quantity: number;
  reorderLevel: number;
  supplier: string;
  unit: string;
}

interface FarmLocalState {
  activities: FarmActivity[];
  cropCycles: CropCycle[];
  fields: FarmField[];
  inputs: FarmInput[];
}

type FarmRecord = Record<string, unknown>;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function isoDate(value: string | null | undefined, fallback: string): string {
  return value && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function seasonLabel(date = new Date()): string {
  const month = date.getUTCMonth();
  if (month <= 2) return "Dry season";
  if (month <= 6) return "Major rains";
  if (month <= 9) return "Field maintenance";
  return "Harvest run";
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

function addDays(base: string, days: number): string {
  const date = new Date(base);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function readLocalState(): FarmLocalState {
  return (
    readJson<FarmLocalState>(FARM_LOCAL_STATE_KEY) ?? {
      activities: [],
      cropCycles: [],
      fields: [],
      inputs: [],
    }
  );
}

function writeLocalState(nextState: FarmLocalState): void {
  writeJson(FARM_LOCAL_STATE_KEY, nextState);
}

function dedupeById<TItem>(items: TItem[], getId: (item: TItem) => string): TItem[] {
  const seen = new Set<string>();
  const result: TItem[] = [];

  for (const item of items) {
    const id = getId(item);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push(item);
  }

  return result;
}

function mergeLocalWorkspace(workspace: FarmWorkspace): FarmWorkspace {
  const localState = readLocalState();

  return {
    ...workspace,
    activities: dedupeById([...localState.activities, ...workspace.activities], (item) => item.activityId),
    cropCycles: dedupeById([...localState.cropCycles, ...workspace.cropCycles], (item) => item.cropCycleId),
    fields: dedupeById([...localState.fields, ...workspace.fields], (item) => item.fieldId),
    inputs: dedupeById([...localState.inputs, ...workspace.inputs], (item) => item.inputId),
  };
}

function normalizeBoundary(value: unknown, farm: Pick<FarmSummary, "latitude" | "longitude">, seed: number): BoundaryPoint[] {
  if (Array.isArray(value)) {
    const points = value
      .map((point) => {
        if (!point || typeof point !== "object") {
          return null;
        }

        const lat = safeNumber((point as Record<string, unknown>).lat, NaN);
        const lng = safeNumber((point as Record<string, unknown>).lng, NaN);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }

        return { lat, lng };
      })
      .filter((point): point is BoundaryPoint => point !== null);

    if (points.length >= 3) {
      return points;
    }
  }

  if (value && typeof value === "object") {
    const geo = value as Record<string, unknown>;
    const coordinates = Array.isArray(geo.coordinates) ? geo.coordinates : null;
    if (geo.type === "Polygon" && coordinates && Array.isArray(coordinates[0])) {
      const polygon = coordinates[0]
        .map((coordinate) => {
          if (!Array.isArray(coordinate) || coordinate.length < 2) {
            return null;
          }

          const lng = safeNumber(coordinate[0], NaN);
          const lat = safeNumber(coordinate[1], NaN);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
          }

          return { lat, lng };
        })
        .filter((point): point is BoundaryPoint => point !== null);

      if (polygon.length >= 3) {
        return polygon;
      }
    }
  }

  const offsetLat = 0.004 + seed * 0.002;
  const offsetLng = 0.006 + seed * 0.002;

  return [
    { lat: farm.latitude + offsetLat, lng: farm.longitude - offsetLng },
    { lat: farm.latitude + offsetLat * 1.2, lng: farm.longitude + offsetLng * 0.3 },
    { lat: farm.latitude - offsetLat * 0.4, lng: farm.longitude + offsetLng },
    { lat: farm.latitude - offsetLat, lng: farm.longitude - offsetLng * 0.2 },
  ];
}

function normalizeFarmRecord(record: FarmRecord): FarmSummary {
  const latitude = safeNumber(record.latitude, 9.4034);
  const longitude = safeNumber(record.longitude, -0.8424);

  return {
    countryCode: safeString(record.country_code, "GH"),
    currentSeason: seasonLabel(),
    district: safeString(record.district, "Tamale Metropolitan"),
    farmId: safeString(record.farm_id, "farm-gh-001"),
    farmName: safeString(record.farm_name, "Farm Operations"),
    hectares: safeNumber(record.hectares, 12.5),
    latitude,
    longitude,
    mode: "live",
    primaryCrop: safeString(record.crop_type, "Maize"),
    region: safeString(record.region, safeString(record.country_code, "GH")),
  };
}

function normalizeFieldRecord(record: FarmRecord, farm: FarmSummary, seed: number): FarmField {
  const plantingDate = isoDate(
    safeString(record.planting_date, ""),
    addDays(new Date().toISOString(), -(40 + seed * 12)),
  );
  const expectedHarvestDate = isoDate(
    safeString(record.expected_harvest_date, ""),
    addDays(plantingDate, 92 + seed * 10),
  );

  return {
    activityCount: safeNumber(record.activity_count, 0),
    areaHectares: safeNumber(record.area_hectares, Math.max(1.2, farm.hectares / 3)),
    boundary: normalizeBoundary(record.boundary_geojson ?? record.boundary, farm, seed),
    currentCrop: titleCase(safeString(record.current_crop, farm.primaryCrop)),
    district: safeString(record.district, farm.district),
    expectedHarvestDate,
    farmId: farm.farmId,
    fieldId: safeString(record.field_id, createId("field")),
    healthSummary: safeString(record.health_summary, "Crop canopy steady; drainage checks due after rainfall."),
    irrigationType: titleCase(safeString(record.irrigation_type, "Rain fed")),
    lastActivityAt: isoDate(safeString(record.last_activity_at, ""), plantingDate),
    lastActivityType: safeString(record.last_activity_type, "planting") as ActivityType,
    name: safeString(record.name, `Field ${seed + 1}`),
    nextTask: safeString(record.next_task, "Inspect stand count and confirm input usage."),
    plantingDate,
    soilType: titleCase(safeString(record.soil_type, "Loam")),
    status: safeString(record.status, "active") as FarmStatus,
    variety: titleCase(safeString(record.variety, "Hybrid")),
  };
}

function normalizeActivityRecord(record: FarmRecord, farmId: string, fieldId: string): FarmActivity {
  return {
    activityId: safeString(record.activity_id, createId("activity")),
    activityType: safeString(record.activity_type, "other") as ActivityType,
    cost: safeNumber(record.cost, 0),
    date: isoDate(safeString(record.date, ""), new Date().toISOString()),
    description: safeString(record.description, "Field activity recorded."),
    farmId,
    fieldId,
    inputsUsed: Array.isArray(record.inputs_used)
      ? record.inputs_used.map((item) => safeString(item, "")).filter(Boolean)
      : [],
    laborHours: safeNumber(record.labor_hours, 0),
    notes: safeString(record.notes, ""),
    photoLabel: typeof record.photo_label === "string" ? record.photo_label : null,
    source: "live",
  };
}

function normalizeInputRecord(record: FarmRecord, farmId: string): FarmInput {
  return {
    cost: safeNumber(record.cost, 0),
    expiryDate: typeof record.expiry_date === "string" ? record.expiry_date : null,
    farmId,
    inputId: safeString(record.input_id, createId("input")),
    inputType: safeString(record.input_type, "other") as InputType,
    name: safeString(record.name, "Farm input"),
    purchaseDate: isoDate(safeString(record.purchase_date, ""), new Date().toISOString()),
    quantity: safeNumber(record.quantity, 0),
    reorderLevel: safeNumber(record.reorder_level, 0),
    supplier: safeString(record.supplier, "Verified supplier"),
    unit: safeString(record.unit, "units"),
  };
}

function normalizeCycleRecord(record: FarmRecord, farmId: string, fieldId: string): CropCycle {
  return {
    cropCycleId: safeString(record.crop_cycle_id, createId("cycle")),
    cropType: titleCase(safeString(record.crop_type, "Maize")),
    farmId,
    fieldId,
    plantingDate: isoDate(safeString(record.planting_date, ""), new Date().toISOString()),
    revenue: record.revenue == null ? null : safeNumber(record.revenue, 0),
    status: safeString(record.status, "active") as CropCycleStatus,
    variety: titleCase(safeString(record.variety, "Hybrid")),
    yieldTons: record.yield_tons == null ? null : safeNumber(record.yield_tons, 0),
    harvestDate: typeof record.harvest_date === "string" ? record.harvest_date : null,
  };
}

function buildReferenceWorkspace(
  profileRecord: FarmRecord | null,
  climateRuntime: Awaited<ReturnType<typeof climateApi.listRuntime>>["data"],
  observationRecords: FarmRecord[],
): FarmWorkspace {
  const farm = normalizeFarmRecord({
    country_code: profileRecord?.country_code,
    crop_type: profileRecord?.crop_type,
    district: profileRecord?.district,
    farm_id: profileRecord?.farm_id,
    farm_name: profileRecord?.farm_name,
    hectares: profileRecord?.hectares,
    latitude: profileRecord?.latitude,
    longitude: profileRecord?.longitude,
    region: profileRecord?.country_code,
  });
  farm.mode = "reference";

  const latestObservation = observationRecords[0] ?? {};
  const fields: FarmField[] = [
    normalizeFieldRecord(
      {
        area_hectares: Math.max(1.7, farm.hectares * 0.42),
        current_crop: farm.primaryCrop,
        expected_harvest_date: addDays(new Date().toISOString(), 54),
        field_id: `${farm.farmId}-north`,
        health_summary: "Nitrogen recovery looks stable after last top-dress; scout low corner after rain.",
        irrigation_type: "Rain fed",
        last_activity_at: addDays(new Date().toISOString(), -2),
        last_activity_type: "fertilizing",
        name: "North Ridge",
        next_task: "Drainage walk and tassel-stage scouting tomorrow morning.",
        planting_date: addDays(new Date().toISOString(), -48),
        soil_type: "Loam",
        status: "active",
        variety: "Obatanpa",
      },
      farm,
      0,
    ),
    normalizeFieldRecord(
      {
        area_hectares: Math.max(1.4, farm.hectares * 0.33),
        current_crop: "Groundnut",
        expected_harvest_date: addDays(new Date().toISOString(), 39),
        field_id: `${farm.farmId}-basin`,
        health_summary: "Stand establishment is even; maintain weed-control cadence through the next 10 days.",
        irrigation_type: "Drip assisted",
        last_activity_at: addDays(new Date().toISOString(), -5),
        last_activity_type: "weeding",
        name: "Basin Block",
        next_task: "Spot-spray broadleaf pressure near the eastern edge.",
        planting_date: addDays(new Date().toISOString(), -31),
        soil_type: "Sandy loam",
        status: "active",
        variety: "Chinese Early",
      },
      farm,
      1,
    ),
    normalizeFieldRecord(
      {
        area_hectares: Math.max(1.1, farm.hectares * 0.25),
        current_crop: "Soybean",
        expected_harvest_date: addDays(new Date().toISOString(), 76),
        field_id: `${farm.farmId}-trial`,
        health_summary: "Seedbed completed; waiting for a clean planting window after the current weather watch.",
        irrigation_type: "Manual hose set",
        last_activity_at: addDays(new Date().toISOString(), -1),
        last_activity_type: "other",
        name: "Trial Plot",
        next_task: "Confirm seed arrival and open the field for planting.",
        planting_date: addDays(new Date().toISOString(), 9),
        soil_type: "Clay loam",
        status: "preparing",
        variety: "Jenguma",
      },
      farm,
      2,
    ),
  ];

  const inputs: FarmInput[] = [
    normalizeInputRecord(
      {
        cost: 1840,
        expiry_date: addDays(new Date().toISOString(), 120),
        input_id: `${farm.farmId}-urea`,
        input_type: "fertilizer",
        name: "Urea 50kg bags",
        purchase_date: addDays(new Date().toISOString(), -18),
        quantity: 8,
        reorder_level: 6,
        supplier: "Savanna Inputs Cooperative",
        unit: "bags",
      },
      farm.farmId,
    ),
    normalizeInputRecord(
      {
        cost: 920,
        expiry_date: addDays(new Date().toISOString(), 160),
        input_id: `${farm.farmId}-seed`,
        input_type: "seed",
        name: "Obatanpa maize seed",
        purchase_date: addDays(new Date().toISOString(), -56),
        quantity: 3,
        reorder_level: 4,
        supplier: "Tamale Seed Hub",
        unit: "sacks",
      },
      farm.farmId,
    ),
    normalizeInputRecord(
      {
        cost: 460,
        expiry_date: addDays(new Date().toISOString(), 65),
        input_id: `${farm.farmId}-glyphosate`,
        input_type: "herbicide",
        name: "Glyphosate mix",
        purchase_date: addDays(new Date().toISOString(), -11),
        quantity: 14,
        reorder_level: 10,
        supplier: "FieldCare Agro Centre",
        unit: "litres",
      },
      farm.farmId,
    ),
  ];

  const activities: FarmActivity[] = [
    normalizeActivityRecord(
      {
        activity_id: `${farm.farmId}-activity-1`,
        activity_type: "fertilizing",
        cost: 610,
        date: addDays(new Date().toISOString(), -2),
        description: "Completed second nitrogen top-dress across North Ridge after rainfall eased.",
        inputs_used: [inputs[0].name],
        labor_hours: 6,
        notes: "Apply only on northern lanes after ponding cleared.",
      },
      farm.farmId,
      fields[0].fieldId,
    ),
    normalizeActivityRecord(
      {
        activity_id: `${farm.farmId}-activity-2`,
        activity_type: "weeding",
        cost: 240,
        date: addDays(new Date().toISOString(), -5),
        description: "Hand-weeded Basin Block perimeter and reopened irrigation furrows.",
        inputs_used: [],
        labor_hours: 4,
        notes: "Pressure strongest on east bund.",
      },
      farm.farmId,
      fields[1].fieldId,
    ),
    normalizeActivityRecord(
      {
        activity_id: `${farm.farmId}-activity-3`,
        activity_type: "scouting",
        cost: 95,
        date: addDays(new Date().toISOString(), -1),
        description: "Walked Trial Plot to confirm soil structure and planting readiness.",
        inputs_used: [],
        labor_hours: 2,
        notes: "Plant only after next weather window confirms drainage.",
      },
      farm.farmId,
      fields[2].fieldId,
    ),
  ];

  const cropCycles: CropCycle[] = [
    normalizeCycleRecord(
      {
        crop_cycle_id: `${fields[0].fieldId}-cycle`,
        crop_type: fields[0].currentCrop,
        harvest_date: fields[0].expectedHarvestDate,
        planting_date: fields[0].plantingDate,
        revenue: null,
        status: "active",
        variety: fields[0].variety,
        yield_tons: null,
      },
      farm.farmId,
      fields[0].fieldId,
    ),
    normalizeCycleRecord(
      {
        crop_cycle_id: `${fields[1].fieldId}-cycle`,
        crop_type: fields[1].currentCrop,
        harvest_date: fields[1].expectedHarvestDate,
        planting_date: fields[1].plantingDate,
        revenue: null,
        status: "active",
        variety: fields[1].variety,
        yield_tons: null,
      },
      farm.farmId,
      fields[1].fieldId,
    ),
    normalizeCycleRecord(
      {
        crop_cycle_id: `${fields[2].fieldId}-cycle`,
        crop_type: fields[2].currentCrop,
        harvest_date: fields[2].expectedHarvestDate,
        planting_date: fields[2].plantingDate,
        revenue: null,
        status: "planned",
        variety: fields[2].variety,
        yield_tons: null,
      },
      farm.farmId,
      fields[2].fieldId,
    ),
  ];

  const rainfallMm = latestObservation.rainfall_mm == null ? null : safeNumber(latestObservation.rainfall_mm, 0);
  const temperatureC = latestObservation.temperature_c == null ? null : safeNumber(latestObservation.temperature_c, 0);
  const soilMoisturePct =
    latestObservation.soil_moisture_pct == null ? null : safeNumber(latestObservation.soil_moisture_pct, 0);
  const primaryAlert = climateRuntime.alerts[0];

  return {
    activities,
    cropCycles,
    farm,
    fields,
    inputs,
    weather: {
      alertSummary:
        primaryAlert?.summary ??
        "Weather watch is clear. Use the next scouting window to confirm canopy and drainage posture.",
      rainfallMm,
      riskLabel: primaryAlert?.severity ? titleCase(primaryAlert.severity) : "Operational watch",
      soilMoisturePct,
      sourceLabel: climateRuntime.runtime_mode === "live" ? "Climate runtime" : "Reference profile",
      temperatureC,
    },
  };
}

async function loadReferenceWorkspace(
  traceId: string,
  locale: string | null | undefined,
): Promise<ResponseEnvelope<FarmWorkspace>> {
  const runtime = await climateApi.listRuntime(traceId, locale);
  const farmId =
    runtime.data.alerts[0]?.farm_profile_id ?? runtime.data.evidence_records[0]?.farm_profile_id ?? "farm-gh-001";

  let profileRecord: FarmRecord | null = null;
  let observationRecords: FarmRecord[] = [];

  try {
    const profileResponse = await requestJson<FarmRecord>(
      `/api/v1/climate/farms/${farmId}`,
      { method: "GET" },
      traceId,
      true,
    );
    profileRecord = profileResponse.data;
  } catch {
    profileRecord = null;
  }

  try {
    const observationsResponse = await requestJson<unknown>(
      `/api/v1/climate/observations?farm_id=${encodeURIComponent(farmId)}`,
      { method: "GET" },
      traceId,
      true,
    );
    observationRecords = unwrapCollection<FarmRecord>(observationsResponse.data);
  } catch {
    observationRecords = [];
  }

  return responseEnvelope(buildReferenceWorkspace(profileRecord, runtime.data, observationRecords), traceId);
}

export const farmApi = {
  async addField(
    farmId: string,
    input: AddFieldInput,
    traceId: string,
  ): Promise<ResponseEnvelope<FarmField>> {
    try {
      const response = await requestJson<FarmRecord>(
        `/api/v1/farms/${farmId}/fields`,
        {
          method: "POST",
          body: JSON.stringify({
            area_hectares: input.areaHectares,
            boundary_geojson: {
              type: "Polygon",
              coordinates: [input.boundary.map((point) => [point.lng, point.lat])],
            },
            current_crop: input.currentCrop,
            district: input.district,
            expected_harvest_date: input.expectedHarvestDate,
            irrigation_type: input.irrigationType,
            name: input.name,
            planting_date: input.plantingDate,
            soil_type: input.soilType,
            variety: input.variety,
          }),
        },
        traceId,
        true,
      );

      const session = readSession();
      const liveFarm = normalizeFarmRecord({
        country_code: session?.actor.country_code,
        crop_type: input.currentCrop,
        district: input.district,
        farm_id: farmId,
        farm_name: "Farm operations",
      });

      return responseEnvelope(normalizeFieldRecord(response.data, liveFarm, 0), traceId);
    } catch {
      const session = readSession();
      const farm = normalizeFarmRecord({
        country_code: session?.actor.country_code,
        crop_type: input.currentCrop,
        district: input.district,
        farm_id: farmId,
        farm_name: "Farm operations",
      });
      const field = normalizeFieldRecord(
        {
          area_hectares: input.areaHectares,
          boundary_geojson: {
            type: "Polygon",
            coordinates: [input.boundary.map((point) => [point.lng, point.lat])],
          },
          current_crop: input.currentCrop,
          district: input.district,
          expected_harvest_date: input.expectedHarvestDate,
          field_id: createId("field"),
          irrigation_type: input.irrigationType,
          name: input.name,
          planting_date: input.plantingDate,
          soil_type: input.soilType,
          status: "preparing",
          variety: input.variety,
        },
        farm,
        readLocalState().fields.length,
      );

      const localState = readLocalState();
      writeLocalState({
        ...localState,
        fields: [field, ...localState.fields],
      });

      return responseEnvelope(field, traceId);
    }
  },

  async addInput(
    farmId: string,
    input: AddInputInput,
    traceId: string,
  ): Promise<ResponseEnvelope<FarmInput>> {
    try {
      const response = await requestJson<FarmRecord>(
        `/api/v1/farms/${farmId}/inputs`,
        {
          method: "POST",
          body: JSON.stringify({
            cost: input.cost,
            expiry_date: input.expiryDate ?? null,
            input_type: input.inputType,
            name: input.name,
            purchase_date: input.purchaseDate,
            quantity: input.quantity,
            reorder_level: input.reorderLevel,
            supplier: input.supplier,
            unit: input.unit,
          }),
        },
        traceId,
        true,
      );

      return responseEnvelope(normalizeInputRecord(response.data, farmId), traceId);
    } catch {
      const draft = normalizeInputRecord(
        {
          cost: input.cost,
          expiry_date: input.expiryDate ?? null,
          input_id: createId("input"),
          input_type: input.inputType,
          name: input.name,
          purchase_date: input.purchaseDate,
          quantity: input.quantity,
          reorder_level: input.reorderLevel,
          supplier: input.supplier,
          unit: input.unit,
        },
        farmId,
      );

      const localState = readLocalState();
      writeLocalState({
        ...localState,
        inputs: [draft, ...localState.inputs],
      });

      return responseEnvelope(draft, traceId);
    }
  },

  async getWorkspace(
    traceId: string,
    locale?: string | null,
  ): Promise<ResponseEnvelope<FarmWorkspace>> {
    try {
      const farmsResponse = await requestJson<unknown>("/api/v1/farms", { method: "GET" }, traceId, true);
      const farmRecords = unwrapCollection<FarmRecord>(farmsResponse.data);

      if (farmRecords.length === 0) {
        throw new Error("farm_workspace_empty");
      }

      const farm = normalizeFarmRecord(farmRecords[0]);
      const [fieldsResponse, activitiesResponse, inputsResponse, cropCyclesResponse, climateRuntime] =
        await Promise.allSettled([
          requestJson<unknown>(`/api/v1/farms/${farm.farmId}/fields`, { method: "GET" }, traceId, true),
          requestJson<unknown>(`/api/v1/farms/${farm.farmId}/activities`, { method: "GET" }, traceId, true),
          requestJson<unknown>(`/api/v1/farms/${farm.farmId}/inputs`, { method: "GET" }, traceId, true),
          requestJson<unknown>(`/api/v1/farms/${farm.farmId}/crop-cycles`, { method: "GET" }, traceId, true),
          climateApi.listRuntime(traceId, locale),
        ]);

      const fields =
        fieldsResponse.status === "fulfilled"
          ? unwrapCollection<FarmRecord>(fieldsResponse.value.data).map((item, index) =>
              normalizeFieldRecord(item, farm, index),
            )
          : [];
      const activities =
        activitiesResponse.status === "fulfilled"
          ? unwrapCollection<FarmRecord>(activitiesResponse.value.data).map((item) =>
              normalizeActivityRecord(item, farm.farmId, safeString(item.field_id, fields[0]?.fieldId ?? "")),
            )
          : [];
      const inputs =
        inputsResponse.status === "fulfilled"
          ? unwrapCollection<FarmRecord>(inputsResponse.value.data).map((item) => normalizeInputRecord(item, farm.farmId))
          : [];
      const cropCycles =
        cropCyclesResponse.status === "fulfilled"
          ? unwrapCollection<FarmRecord>(cropCyclesResponse.value.data).map((item) =>
              normalizeCycleRecord(item, farm.farmId, safeString(item.field_id, fields[0]?.fieldId ?? "")),
            )
          : [];

      const runtime = climateRuntime.status === "fulfilled" ? climateRuntime.value.data : null;
      const primaryAlert = runtime?.alerts[0];

      const workspace = mergeLocalWorkspace({
        activities,
        cropCycles,
        farm,
        fields,
        inputs,
        weather: {
          alertSummary:
            primaryAlert?.summary ??
            "No climate exception is attached to this farm yet. Keep activity cadence visible while RB-053 read models mature.",
          rainfallMm: null,
          riskLabel: primaryAlert?.severity ? titleCase(primaryAlert.severity) : "Stable",
          soilMoisturePct: null,
          sourceLabel: runtime?.runtime_mode === "live" ? "Climate runtime" : "Farm profile",
          temperatureC: null,
        },
      });

      if (workspace.fields.length === 0) {
        throw new Error("farm_fields_missing");
      }

      return responseEnvelope(workspace, traceId);
    } catch {
      const referenceWorkspace = await loadReferenceWorkspace(traceId, locale);
      return responseEnvelope(mergeLocalWorkspace(referenceWorkspace.data), traceId);
    }
  },

  async logActivity(
    farmId: string,
    input: LogActivityInput,
    traceId: string,
  ): Promise<ResponseEnvelope<FarmActivity>> {
    try {
      const response = await requestJson<FarmRecord>(
        `/api/v1/farms/${farmId}/activities`,
        {
          method: "POST",
          body: JSON.stringify({
            activity_type: input.activityType,
            cost: input.cost,
            date: input.date,
            description: input.description,
            field_id: input.fieldId,
            inputs_used: input.inputsUsed,
            labor_hours: input.laborHours,
            notes: input.notes,
            photo_label: input.photoLabel ?? null,
          }),
        },
        traceId,
        true,
      );

      return responseEnvelope(normalizeActivityRecord(response.data, farmId, input.fieldId), traceId);
    } catch {
      const draft = normalizeActivityRecord(
        {
          activity_id: createId("activity"),
          activity_type: input.activityType,
          cost: input.cost,
          date: input.date,
          description: input.description,
          inputs_used: input.inputsUsed,
          labor_hours: input.laborHours,
          notes: input.notes,
          photo_label: input.photoLabel ?? null,
        },
        farmId,
        input.fieldId,
      );

      const localState = readLocalState();
      writeLocalState({
        ...localState,
        activities: [draft, ...localState.activities],
      });

      return responseEnvelope(draft, traceId);
    }
  },
};

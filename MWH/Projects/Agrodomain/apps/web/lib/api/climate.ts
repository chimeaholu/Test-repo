/**
 * RB-002 — Climate domain service.
 *
 * Climate alerts, degraded-mode indicators, MRV evidence records,
 * and alert acknowledgement. Includes backend response normalizers
 * and locale-aware fallback fixtures for offline/demo resilience.
 */

import type { ResponseEnvelope } from "@agrodomain/contracts";
import {
  climateAlertAcknowledgementSchema,
  climateAlertSchema,
  climateDegradedModeSchema,
  mrvEvidenceRecordSchema,
  schemaVersion,
} from "@agrodomain/contracts";

import {
  CLIMATE_ALERT_ACK_KEY,
  nowIso,
  readJson,
  readSession,
  requestJson,
  responseEnvelope,
  unwrapCollection,
  writeJson,
} from "../api-client";
import type {
  ClimateAlert,
  ClimateAlertAcknowledgement,
  ClimateAlertApiRecord,
  ClimateObservationApiRecord,
  ClimateObservationRead,
  ClimateDegradedMode,
  ClimateDegradedModeApiRecord,
  ClimateRuntimeSnapshot,
  FarmProfileApiRecord,
  FarmProfileRead,
  MrvEvidenceApiRecord,
  MrvEvidenceRecord,
} from "../api-types";

// ---------------------------------------------------------------------------
// Locale resolution
// ---------------------------------------------------------------------------

const advisoryLocales = ["en-GH", "fr-CI", "sw-KE"] as const;

function resolveSupportedLocale(
  locale: string | null | undefined,
): string {
  if (!locale) return "en-GH";
  if (
    advisoryLocales.includes(
      locale as (typeof advisoryLocales)[number],
    )
  )
    return locale;
  const language = locale.split("-")[0];
  const match = advisoryLocales.find((c) =>
    c.startsWith(`${language}-`),
  );
  return match ?? "en-GH";
}

function resolveCountryCode(locale: string): string {
  return locale.endsWith("-KE")
    ? "KE"
    : locale.endsWith("-CI")
      ? "CI"
      : "GH";
}

function farmIdSlug(farmId: string): string {
  return farmId.replace(/^farm-/, "").replace(/-/g, " ");
}

function normalizeFarmProfile(
  value: FarmProfileApiRecord,
): FarmProfileRead {
  return {
    schema_version: value.schema_version ?? schemaVersion,
    farm_id: value.farm_id,
    actor_id: value.actor_id,
    country_code: value.country_code,
    farm_name: value.farm_name,
    district: value.district,
    crop_type: value.crop_type,
    hectares: value.hectares,
    latitude: value.latitude ?? null,
    longitude: value.longitude ?? null,
    metadata: value.metadata ?? {},
    created_at: value.created_at,
    updated_at: value.updated_at,
  };
}

function normalizeObservation(
  value: ClimateObservationApiRecord,
): ClimateObservationRead {
  return {
    schema_version: value.schema_version ?? schemaVersion,
    observation_id: value.observation_id,
    farm_id: value.farm_id,
    actor_id: value.actor_id,
    country_code: value.country_code,
    source_id: value.source_id,
    source_type: value.source_type,
    observed_at: value.observed_at,
    source_window_start: value.source_window_start,
    source_window_end: value.source_window_end,
    rainfall_mm: value.rainfall_mm ?? null,
    temperature_c: value.temperature_c ?? null,
    soil_moisture_pct: value.soil_moisture_pct ?? null,
    anomaly_score: value.anomaly_score ?? null,
    ingestion_state: value.ingestion_state,
    degraded_mode: Boolean(value.degraded_mode),
    degraded_reason_codes: value.degraded_reason_codes ?? [],
    assumptions: value.assumptions ?? [],
    provenance: value.provenance ?? [],
    normalized_payload: value.normalized_payload ?? {},
    farm_profile: value.farm_profile ? normalizeFarmProfile(value.farm_profile) : null,
    created_at: value.created_at,
  };
}

// ---------------------------------------------------------------------------
// Backend → contract normalizers
// ---------------------------------------------------------------------------

function normalizeClimateAlert(
  value: ClimateAlertApiRecord,
  locale: string,
): ClimateAlert {
  let severity = value.severity;
  if (severity === "high") severity = "warning";
  if (severity === "low") severity = "info";
  return climateAlertSchema.parse({
    schema_version: schemaVersion,
    alert_id: value.alert_id,
    farm_profile_id: value.farm_id ?? value.alert_id,
    country_code: locale.endsWith("-GH")
      ? "GH"
      : (locale.split("-")[1] ?? "GH"),
    locale,
    severity,
    title: value.headline ?? "Climate alert",
    summary:
      value.detail ??
      "Climate alert detail is available in the live runtime.",
    source_ids: value.observation_id
      ? [value.observation_id]
      : [value.alert_id],
    degraded_mode: Boolean(value.degraded_mode),
    acknowledged: value.status === "acknowledged",
    created_at: value.created_at,
  });
}

function normalizeClimateDegradedMode(
  value: ClimateDegradedModeApiRecord,
): ClimateDegradedMode {
  return climateDegradedModeSchema.parse({
    schema_version: schemaVersion,
    source_window_id: value.source_window_id,
    country_code: value.country_code,
    farm_profile_id: value.farm_profile_id,
    degraded_mode: true,
    reason_code: value.reason_code,
    assumptions: value.assumptions,
    source_ids: value.source_ids ?? [],
    detected_at: value.detected_at,
  });
}

function normalizeMrvEvidence(
  value: MrvEvidenceApiRecord,
): MrvEvidenceRecord {
  const sourceReferences = Array.isArray(value.source_references)
    ? value.source_references
    : Array.isArray(value.provenance)
      ? value.provenance.map((item, index) => ({
          source_id: String(
            item.source_id ??
              item.observation_id ??
              `${value.evidence_id}-source-${index + 1}`,
          ),
          title: String(item.title ?? `Climate source ${index + 1}`),
          method_reference: String(
            item.method_reference ??
              value.method_references?.[index] ??
              value.method_references?.[0] ??
              value.method_tag,
          ),
        }))
      : [];

  return mrvEvidenceRecordSchema.parse({
    schema_version: schemaVersion,
    evidence_id: value.evidence_id,
    farm_profile_id:
      value.farm_profile_id ?? value.farm_id ?? value.evidence_id,
    country_code: value.country_code,
    method_tag: value.method_tag,
    assumption_notes:
      value.assumption_notes ?? value.assumptions ?? [],
    source_references:
      sourceReferences.length > 0
        ? sourceReferences
        : [
            {
              source_id: `${value.evidence_id}-source-1`,
              title: `Climate source ${value.evidence_id}`,
              method_reference:
                value.method_references?.[0] ?? value.method_tag,
            },
          ],
    source_completeness:
      value.source_completeness === "complete" ||
      value.source_completeness_state === "complete"
        ? "complete"
        : "degraded",
    created_at: value.created_at,
  });
}

// ---------------------------------------------------------------------------
// Acknowledgement state (localStorage-backed, SSR-safe)
// ---------------------------------------------------------------------------

function readAcknowledgementState(): Record<
  string,
  ClimateAlertAcknowledgement
> {
  return (
    readJson<Record<string, ClimateAlertAcknowledgement>>(
      CLIMATE_ALERT_ACK_KEY,
    ) ?? {}
  );
}

function writeAcknowledgementState(
  state: Record<string, ClimateAlertAcknowledgement>,
): void {
  writeJson(CLIMATE_ALERT_ACK_KEY, state);
}

// ---------------------------------------------------------------------------
// Fallback fixture builder (offline / demo resilience)
// ---------------------------------------------------------------------------

function buildClimateFixtures(locale: string): ClimateRuntimeSnapshot {
  const resolvedLocale = resolveSupportedLocale(locale);
  const countryCode = resolveCountryCode(resolvedLocale);
  const cc = countryCode.toLowerCase();
  const alertState = readAcknowledgementState();

  const alerts = [
    {
      schema_version: schemaVersion,
      alert_id: `climate-${cc}-001`,
      farm_profile_id: `farm-${cc}-001`,
      country_code: countryCode,
      locale: resolvedLocale,
      severity: "critical",
      title:
        resolvedLocale === "fr-CI"
          ? "Risque eleve de saturation du sol"
          : resolvedLocale === "sw-KE"
            ? "Hatari kubwa ya udongo kushiba maji"
            : "High soil saturation risk",
      summary:
        resolvedLocale === "fr-CI"
          ? "Deux jours de pluie continue augmentent le risque d'asphyxie racinaire dans les bas-fonds."
          : resolvedLocale === "sw-KE"
            ? "Mvua ya siku mbili imeongeza hatari ya mizizi kukosa hewa kwenye sehemu za chini."
            : "Two consecutive heavy-rain windows raise root stress risk in low-field blocks.",
      source_ids: [
        `source-window-${cc}-01`,
        `radar-${cc}-02`,
      ],
      degraded_mode: false,
      acknowledged: Boolean(alertState[`climate-${cc}-001`]),
      created_at: "2026-04-18T20:20:00.000Z",
    },
    {
      schema_version: schemaVersion,
      alert_id: `climate-${cc}-002`,
      farm_profile_id: `farm-${cc}-001`,
      country_code: countryCode,
      locale: resolvedLocale,
      severity: "warning",
      title:
        resolvedLocale === "fr-CI"
          ? "Fenetre meteo incomplete"
          : resolvedLocale === "sw-KE"
            ? "Dirisha la hali ya hewa halijakamilika"
            : "Weather window incomplete",
      summary:
        resolvedLocale === "fr-CI"
          ? "Les releves de pluie recents sont partiels. Traitez les recommandations comme prudentes jusqu'au prochain rafraichissement."
          : resolvedLocale === "sw-KE"
            ? "Vipimo vya mvua vya karibuni vimekatika. Tumia tahadhari hadi dirisha lijazwe tena."
            : "Recent rainfall readings are partial. Treat operational advice as reduced-confidence until the next refresh.",
      source_ids: [`source-window-${cc}-stale`],
      degraded_mode: true,
      acknowledged: Boolean(alertState[`climate-${cc}-002`]),
      created_at: "2026-04-18T20:24:00.000Z",
    },
  ];

  const degradedModes = [
    {
      schema_version: schemaVersion,
      source_window_id: `source-window-${cc}-stale`,
      country_code: countryCode,
      farm_profile_id: `farm-${cc}-001`,
      degraded_mode: true as const,
      reason_code: "source_window_missing",
      assumptions:
        resolvedLocale === "fr-CI"
          ? [
              "Les donnees radar des 6 dernieres heures sont absentes.",
              "La priorite est donnee au dernier releve valide.",
            ]
          : resolvedLocale === "sw-KE"
            ? [
                "Data ya rada ya saa 6 zilizopita haipo.",
                "Mfumo umetumia dirisha la mwisho lililothibitishwa.",
              ]
            : [
                "Radar observations for the last 6 hours are missing.",
                "The last verified station reading is being used as a temporary assumption.",
              ],
      source_ids: [`station-${cc}-01`],
      detected_at: "2026-04-18T20:24:00.000Z",
    },
  ];

  const evidenceRecords = [
    {
      schema_version: schemaVersion,
      evidence_id: `mrv-${cc}-001`,
      farm_profile_id: `farm-${cc}-001`,
      country_code: countryCode,
      method_tag: "ipcc-tier-2-soil-moisture",
      assumption_notes:
        resolvedLocale === "fr-CI"
          ? [
              "Le bloc nord est evalue avec la derniere mesure valide.",
              "Le calcul exclut les rangs non echantillonnes.",
            ]
          : resolvedLocale === "sw-KE"
            ? [
                "Kipande cha kaskazini kimetathminiwa kwa kipimo cha mwisho kilichothibitishwa.",
                "Hesabu haijumuishi mistari isiyopimwa.",
              ]
            : [
                "North block moisture is estimated from the last verified reading.",
                "The calculation excludes rows that were not sampled.",
              ],
      source_references: [
        {
          source_id: `mrv-source-${cc}-01`,
          title:
            resolvedLocale === "fr-CI"
              ? "Protocole humidite du sol"
              : resolvedLocale === "sw-KE"
                ? "Mwongozo wa unyevu wa udongo"
                : "Soil moisture field protocol",
          method_reference: "IPCC Tier 2 Annex 4",
        },
      ],
      source_completeness: "partial" as const,
      created_at: "2026-04-18T20:26:00.000Z",
    },
    {
      schema_version: schemaVersion,
      evidence_id: `mrv-${cc}-002`,
      farm_profile_id: `farm-${cc}-001`,
      country_code: countryCode,
      method_tag: "field-drainage-observation",
      assumption_notes:
        resolvedLocale === "fr-CI"
          ? [
              "Aucune hypothese supplementaire; toutes les mesures de terrain sont completes.",
            ]
          : resolvedLocale === "sw-KE"
            ? [
                "Hakuna dhana ya ziada; vipimo vyote vya shambani vimekamilika.",
              ]
            : [
                "No additional assumptions; all field observations were captured in the latest visit.",
              ],
      source_references: [
        {
          source_id: `mrv-source-${cc}-02`,
          title:
            resolvedLocale === "fr-CI"
              ? "Journal de drainage terrain"
              : resolvedLocale === "sw-KE"
                ? "Kumbukumbu ya uondoaji maji shambani"
                : "Field drainage observation log",
          method_reference: "Drainage Checklist v2",
        },
      ],
      source_completeness: "complete" as const,
      created_at: "2026-04-18T20:28:00.000Z",
    },
  ];

  return {
    runtime_mode: "fallback",
    alerts: alerts.map((item) => climateAlertSchema.parse(item)),
    degraded_modes: degradedModes.map((item) =>
      climateDegradedModeSchema.parse(item),
    ),
    evidence_records: evidenceRecords.map((item) =>
      mrvEvidenceRecordSchema.parse(item),
    ),
  };
}

function buildFallbackFarmProfile(
  farmId: string,
  locale: string,
): FarmProfileRead {
  const resolvedLocale = resolveSupportedLocale(locale);
  const countryCode = resolveCountryCode(resolvedLocale);
  const actorId = readSession()?.actor.actor_id ?? "demo:farmer";
  const names: Record<string, string> = {
    CI: "Cote d'Ivoire lowland block",
    GH: "Tamale lowland block",
    KE: "Kakamega hillside block",
  };
  const districts: Record<string, string> = {
    CI: "Korhogo",
    GH: "Tamale",
    KE: "Kakamega",
  };
  const crops: Record<string, string> = {
    CI: "rice",
    GH: "maize",
    KE: "beans",
  };

  return {
    schema_version: schemaVersion,
    farm_id: farmId,
    actor_id: actorId,
    country_code: countryCode,
    farm_name: names[countryCode] ?? `Farm ${farmIdSlug(farmId)}`,
    district: districts[countryCode] ?? "Regional cluster",
    crop_type: crops[countryCode] ?? "maize",
    hectares: countryCode === "KE" ? 7.2 : 12.5,
    latitude: countryCode === "GH" ? 9.4075 : countryCode === "KE" ? 0.2827 : 9.457,
    longitude: countryCode === "GH" ? -0.8533 : countryCode === "KE" ? 34.7519 : -5.0412,
    metadata: {
      source: "fallback",
      irrigation: countryCode === "GH" ? "surface channels" : "rainfed",
    },
    created_at: "2026-04-18T20:00:00.000Z",
    updated_at: "2026-04-18T20:30:00.000Z",
  };
}

function buildFallbackObservations(
  farmId: string,
  locale: string,
): ClimateObservationRead[] {
  const resolvedLocale = resolveSupportedLocale(locale);
  const countryCode = resolveCountryCode(resolvedLocale);
  const actorId = readSession()?.actor.actor_id ?? "demo:farmer";
  const now = Date.now();
  const temperatureBase = countryCode === "KE" ? 26 : countryCode === "CI" ? 29 : 31;
  const rainfallBase = countryCode === "KE" ? 12 : countryCode === "CI" ? 18 : 24;
  const soilBase = countryCode === "KE" ? 54 : countryCode === "CI" ? 61 : 68;

  return Array.from({ length: 8 }, (_, index) => {
    const hoursAgo = (7 - index) * 3;
    const observedAt = new Date(now - hoursAgo * 3_600_000).toISOString();
    const temperature = Number((temperatureBase + Math.sin(index / 2) * 2.6).toFixed(1));
    const rainfall = Number(Math.max(rainfallBase + (index < 3 ? 10 - index * 2 : 4 - index), 0).toFixed(1));
    const soilMoisture = Number(Math.min(Math.max(soilBase + Math.cos(index / 2) * 5, 22), 92).toFixed(1));
    const anomaly = Number(Math.max(0.12, 0.3 + index * 0.05).toFixed(2));

    return {
      schema_version: schemaVersion,
      observation_id: `${farmId}-obs-${index + 1}`,
      farm_id: farmId,
      actor_id: actorId,
      country_code: countryCode,
      source_id: `${countryCode.toLowerCase()}-weather-${index + 1}`,
      source_type: index % 2 === 0 ? "satellite" : "station",
      observed_at: observedAt,
      source_window_start: new Date(new Date(observedAt).getTime() - 3_600_000).toISOString(),
      source_window_end: observedAt,
      rainfall_mm: rainfall,
      temperature_c: temperature,
      soil_moisture_pct: soilMoisture,
      anomaly_score: anomaly,
      ingestion_state: "accepted",
      degraded_mode: index === 0 && countryCode === "GH",
      degraded_reason_codes: index === 0 && countryCode === "GH" ? ["source_window_missing"] : [],
      assumptions: index === 0 && countryCode === "GH" ? ["Fallback source window in use for the latest radar block."] : [],
      provenance: [{ source: "fallback_fixture", window_hours: 3 }],
      normalized_payload: {
        humidity_pct: Math.min(95, Math.round(soilMoisture * 0.9)),
        uv_index: Math.max(3, Math.min(11, Math.round((temperature - 18) / 2))),
        wind_kph: Math.max(8, Math.round(11 + anomaly * 14)),
      },
      farm_profile: null,
      created_at: observedAt,
    };
  }).reverse();
}

// ---------------------------------------------------------------------------
// Climate API
// ---------------------------------------------------------------------------

export const climateApi = {
  async listRuntime(
    traceId: string,
    locale?: string | null,
  ): Promise<ResponseEnvelope<ClimateRuntimeSnapshot>> {
    const session = readSession();
    const resolvedLocale = resolveSupportedLocale(
      locale ?? session?.actor.locale,
    );

    try {
      const params = new URLSearchParams({ locale: resolvedLocale });
      const [alertsResponse, degradedResponse, evidenceResponse] =
        await Promise.all([
          requestJson<unknown>(
            `/api/v1/climate/alerts?${params.toString()}`,
            { method: "GET" },
            traceId,
            true,
          ),
          requestJson<unknown>(
            `/api/v1/climate/degraded-modes?${params.toString()}`,
            { method: "GET" },
            traceId,
            true,
          ),
          requestJson<unknown>(
            `/api/v1/climate/mrv-evidence?${params.toString()}`,
            { method: "GET" },
            traceId,
            true,
          ),
        ]);

      const alerts = unwrapCollection<ClimateAlertApiRecord>(
        alertsResponse.data,
      ).map((item) => normalizeClimateAlert(item, resolvedLocale));
      const degradedModes =
        unwrapCollection<ClimateDegradedModeApiRecord>(
          degradedResponse.data,
        ).map((item) => normalizeClimateDegradedMode(item));
      const evidenceRecords =
        unwrapCollection<MrvEvidenceApiRecord>(
          evidenceResponse.data,
        ).map((item) => normalizeMrvEvidence(item));

      if (alerts.length === 0 || evidenceRecords.length === 0) {
        throw new Error("n4_climate_runtime_empty");
      }

      return responseEnvelope(
        {
          runtime_mode: "live" as const,
          alerts,
          degraded_modes: degradedModes,
          evidence_records: evidenceRecords,
        },
        traceId,
      );
    } catch {
      return responseEnvelope(
        buildClimateFixtures(resolvedLocale),
        traceId,
      );
    }
  },

  async getFarmProfile(
    farmId: string,
    traceId: string,
    locale?: string | null,
  ): Promise<ResponseEnvelope<FarmProfileRead>> {
    const session = readSession();
    const resolvedLocale = resolveSupportedLocale(
      locale ?? session?.actor.locale,
    );

    try {
      const response = await requestJson<FarmProfileApiRecord>(
        `/api/v1/climate/farms/${farmId}`,
        { method: "GET" },
        traceId,
        true,
      );
      return responseEnvelope(
        normalizeFarmProfile(response.data),
        traceId,
      );
    } catch {
      return responseEnvelope(
        buildFallbackFarmProfile(farmId, resolvedLocale),
        traceId,
      );
    }
  },

  async listObservations(
    farmId: string,
    traceId: string,
    locale?: string | null,
  ): Promise<ResponseEnvelope<ClimateObservationRead[]>> {
    const session = readSession();
    const resolvedLocale = resolveSupportedLocale(
      locale ?? session?.actor.locale,
    );

    try {
      const params = new URLSearchParams({ farm_id: farmId });
      const response = await requestJson<unknown>(
        `/api/v1/climate/observations?${params.toString()}`,
        { method: "GET" },
        traceId,
        true,
      );
      const items = unwrapCollection<ClimateObservationApiRecord>(
        response.data,
      ).map((item) => normalizeObservation(item));
      if (items.length === 0) {
        throw new Error("climate_observations_empty");
      }
      return responseEnvelope(items, traceId);
    } catch {
      return responseEnvelope(
        buildFallbackObservations(farmId, resolvedLocale),
        traceId,
      );
    }
  },

  async acknowledgeAlert(
    alertId: string,
    actorId: string,
    traceId: string,
    note?: string,
  ): Promise<ResponseEnvelope<ClimateAlertAcknowledgement>> {
    try {
      const response = await requestJson<unknown>(
        `/api/v1/climate/alerts/${alertId}/acknowledge`,
        {
          method: "POST",
          body: JSON.stringify({
            actor_id: actorId,
            note: note ?? null,
          }),
        },
        traceId,
        true,
      );
      return responseEnvelope(
        climateAlertAcknowledgementSchema.parse(response.data),
        traceId,
      );
    } catch {
      const acknowledgement =
        climateAlertAcknowledgementSchema.parse({
          schema_version: schemaVersion,
          alert_id: alertId,
          actor_id: actorId,
          acknowledged_at: nowIso(),
          note:
            note ??
            "Acknowledged from fallback climate workspace.",
        });
      writeAcknowledgementState({
        ...readAcknowledgementState(),
        [alertId]: acknowledgement,
      });
      return responseEnvelope(acknowledgement, traceId);
    }
  },
};

import type { ResponseEnvelope } from "@agrodomain/contracts";

import {
  readJson,
  readSession,
  requestJson,
  responseEnvelope,
  unwrapCollection,
  writeJson,
} from "../api-client";
import { walletApi } from "./wallet";

export const INSURANCE_POLICIES_KEY = "agrodomain.insurance.policies.v1";

type CoverageType = "comprehensive" | "drought" | "flood" | "pest";
type ClaimStatus = "triggered" | "verified" | "processing" | "paid";

type FarmProfilePayload = {
  actor_id?: string;
  country_code?: string;
  crop_type?: string;
  district?: string;
  farm_id: string;
  farm_name?: string;
  hectares?: number;
  latitude?: number | null;
  longitude?: number | null;
  metadata?: Record<string, unknown>;
};

type ClimateAlertPayload = {
  alert_id: string;
  alert_type?: string;
  created_at: string;
  detail?: string;
  farm_context?: Record<string, unknown>;
  farm_id: string;
  farm_profile?: FarmProfilePayload | null;
  headline?: string;
  observation_id?: string | null;
  severity?: string;
  status?: string;
};

type ClimateObservationPayload = {
  created_at: string;
  farm_id: string;
  farm_profile?: FarmProfilePayload | null;
  observed_at: string;
  rainfall_mm?: number;
  soil_moisture_pct?: number;
  source_window_end: string;
  source_window_start: string;
  temperature_c?: number;
};

type ClimateEvidencePayload = {
  alert_ids?: string[];
  assumptions?: string[];
  created_at: string;
  evidence_id: string;
  farm_id: string;
  farm_profile?: FarmProfilePayload | null;
  method_references?: string[];
  method_tag?: string;
  provenance?: Array<Record<string, unknown>>;
  source_completeness_state?: string;
  summary?: string;
};

export type InsuranceFieldSummary = {
  crop_type: string;
  district: string;
  farm_id: string;
  farm_name: string;
  hectares: number;
  latitude: number | null;
  longitude: number | null;
  risk_level: "elevated" | "guarded" | "stable";
};

export type InsurancePolicyRecord = {
  active_claim_count: number;
  coverage_amount: number;
  coverage_type: CoverageType;
  coverage_window_label: string;
  currency: string;
  field: InsuranceFieldSummary;
  payment_reference: string;
  policy_id: string;
  premium_amount: number;
  provider_name: string;
  purchased_at: string;
  status: "active" | "pending" | "expired";
  weather_link_label: string;
};

export type InsuranceClaimStage = {
  at: string;
  id: ClaimStatus;
  label: string;
};

export type InsuranceClaimRecord = {
  claim_id: string;
  coverage_amount: number;
  claim_amount: number;
  coverage_type: CoverageType;
  currency: string;
  detail: string;
  evidence_count: number;
  field: InsuranceFieldSummary;
  payout_reference: string;
  payout_to: string;
  policy_id: string;
  reported_at: string;
  status: ClaimStatus;
  timeline: InsuranceClaimStage[];
  title: string;
  trigger_condition: string;
};

export type InsuranceRainfallPoint = {
  actual: number;
  expected: number;
  label: string;
  threshold: number;
};

export type InsuranceEvidenceAttachment = {
  id: string;
  label: string;
  type: "climate_window" | "field_note" | "satellite";
  value: string;
};

export type InsuranceClaimDetailRecord = InsuranceClaimRecord & {
  attachments: InsuranceEvidenceAttachment[];
  rainfall_points: InsuranceRainfallPoint[];
  source_summary: string;
};

export type InsuranceDashboard = {
  claims: InsuranceClaimRecord[];
  fields: InsuranceFieldSummary[];
  kpis: {
    active_claims: number;
    total_coverage: number;
    total_payouts_received: number;
    total_premiums_reserved: number;
  };
  policies: InsurancePolicyRecord[];
  wallet: {
    available_after_reserve: number;
    available_balance: number;
    currency: string;
    total_balance: number;
  };
};

export type PurchaseCoverageInput = {
  coverage_amount: number;
  coverage_type: CoverageType;
  field_id: string;
  premium_amount: number;
  coverage_window_label: string;
};

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  GH: "GHS",
  JM: "JMD",
  NG: "NGN",
};

const COVERAGE_RATE_MAP: Record<CoverageType, number> = {
  comprehensive: 0.082,
  drought: 0.057,
  flood: 0.062,
  pest: 0.051,
};

function currencyForCountry(countryCode: string | undefined): string {
  return COUNTRY_CURRENCY_MAP[countryCode ?? ""] ?? "USD";
}

function readStoredPolicies(): InsurancePolicyRecord[] {
  return readJson<InsurancePolicyRecord[]>(INSURANCE_POLICIES_KEY) ?? [];
}

function writeStoredPolicies(policies: InsurancePolicyRecord[]): void {
  writeJson(INSURANCE_POLICIES_KEY, policies);
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function toTitleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function coverageTypeFromAlert(alertType: string | undefined): CoverageType {
  if (alertType?.includes("rain") || alertType?.includes("flood")) {
    return "flood";
  }
  if (alertType?.includes("pest")) {
    return "pest";
  }
  if (alertType?.includes("heat") || alertType?.includes("drought")) {
    return "drought";
  }
  return "comprehensive";
}

function coverageLabel(coverageType: CoverageType): string {
  return coverageType === "comprehensive" ? "Comprehensive cover" : `${toTitleCase(coverageType)} cover`;
}

function calculateRiskLevel(alertCount: number, latestRainfall: number | null): InsuranceFieldSummary["risk_level"] {
  if (alertCount >= 2 || (latestRainfall !== null && latestRainfall >= 40)) {
    return "elevated";
  }
  if (alertCount >= 1 || (latestRainfall !== null && latestRainfall >= 24)) {
    return "guarded";
  }
  return "stable";
}

export function calculateInsurancePremium(params: {
  coverageAmount: number;
  coverageType: CoverageType;
  hectares: number;
  riskLevel: InsuranceFieldSummary["risk_level"];
}): number {
  const baseRate = COVERAGE_RATE_MAP[params.coverageType];
  const acreageFactor = params.hectares >= 10 ? 1.05 : params.hectares >= 5 ? 1 : 0.94;
  const riskFactor = params.riskLevel === "elevated" ? 1.15 : params.riskLevel === "guarded" ? 1.06 : 0.97;
  return Math.round(params.coverageAmount * baseRate * acreageFactor * riskFactor);
}

function deriveFieldSummaries(
  alerts: ClimateAlertPayload[],
  observations: ClimateObservationPayload[],
  evidence: ClimateEvidencePayload[],
): InsuranceFieldSummary[] {
  const map = new Map<string, InsuranceFieldSummary>();

  const ensureField = (farmId: string, payload?: FarmProfilePayload | null, farmContext?: Record<string, unknown>) => {
    const latestRainfall =
      observations
        .filter((item) => item.farm_id === farmId)
        .sort((left, right) => Date.parse(right.observed_at) - Date.parse(left.observed_at))[0]?.rainfall_mm ?? null;
    const alertCount = alerts.filter((item) => item.farm_id === farmId).length;
    map.set(farmId, {
      crop_type: stringValue(payload?.crop_type ?? farmContext?.crop_type, "Mixed crops"),
      district: stringValue(payload?.district ?? farmContext?.district, "Climate-linked district"),
      farm_id: farmId,
      farm_name: stringValue(payload?.farm_name ?? farmContext?.farm_name, "AgroShield field"),
      hectares: numberValue(payload?.hectares ?? farmContext?.hectares, 6),
      latitude: typeof payload?.latitude === "number" ? payload.latitude : null,
      longitude: typeof payload?.longitude === "number" ? payload.longitude : null,
      risk_level: calculateRiskLevel(alertCount, latestRainfall),
    });
  };

  alerts.forEach((alert) => ensureField(alert.farm_id, alert.farm_profile, alert.farm_context));
  observations.forEach((item) => ensureField(item.farm_id, item.farm_profile, undefined));
  evidence.forEach((item) => ensureField(item.farm_id, item.farm_profile, undefined));

  return Array.from(map.values()).sort((left, right) => left.farm_name.localeCompare(right.farm_name));
}

function buildSeedPolicies(fields: InsuranceFieldSummary[], alerts: ClimateAlertPayload[], currency: string): InsurancePolicyRecord[] {
  const primaryField = fields[0];
  if (!primaryField) {
    return [];
  }

  const primaryAlert = alerts.find((item) => item.farm_id === primaryField.farm_id);
  const coverageType = coverageTypeFromAlert(primaryAlert?.alert_type);
  const coverageAmount = Math.round(primaryField.hectares * 320);
  const premiumAmount = calculateInsurancePremium({
    coverageAmount,
    coverageType,
    hectares: primaryField.hectares,
    riskLevel: primaryField.risk_level,
  });

  return [
    {
      active_claim_count: primaryAlert ? 1 : 0,
      coverage_amount: coverageAmount,
      coverage_type: coverageType,
      coverage_window_label: "Main season 2026",
      currency,
      field: primaryField,
      payment_reference: "AGROSHIELD-DEMO-0001",
      policy_id: `policy-seed-${primaryField.farm_id}`,
      premium_amount: premiumAmount,
      provider_name: "AgroShield Climate Pool",
      purchased_at: "2026-03-12T09:00:00.000Z",
      status: "active",
      weather_link_label: primaryAlert?.headline ?? "Weather-linked cover is active for this field.",
    },
  ];
}

function claimStatusForAlert(alert: ClimateAlertPayload): ClaimStatus {
  if (alert.status === "acknowledged") {
    return "processing";
  }
  if (alert.severity === "critical") {
    return "paid";
  }
  return "verified";
}

function stageEntries(claimedAt: string, status: ClaimStatus): InsuranceClaimStage[] {
  const base = Date.parse(claimedAt);
  const stages: InsuranceClaimStage[] = [
    { at: new Date(base).toISOString(), id: "triggered", label: "Triggered" },
    { at: new Date(base + 24 * 60 * 60 * 1000).toISOString(), id: "verified", label: "Verified" },
    { at: new Date(base + 3 * 24 * 60 * 60 * 1000).toISOString(), id: "processing", label: "Processing" },
    { at: new Date(base + 5 * 24 * 60 * 60 * 1000).toISOString(), id: "paid", label: "Paid" },
  ];

  if (status === "verified") {
    return stages.slice(0, 2);
  }
  if (status === "processing") {
    return stages.slice(0, 3);
  }
  return stages;
}

function buildRainfallPoints(observations: ClimateObservationPayload[], fieldId: string): InsuranceRainfallPoint[] {
  const source = observations.filter((item) => item.farm_id === fieldId);
  if (source.length === 0) {
    return [
      { actual: 18, expected: 26, label: "Mon", threshold: 22 },
      { actual: 20, expected: 28, label: "Tue", threshold: 22 },
      { actual: 16, expected: 27, label: "Wed", threshold: 22 },
      { actual: 24, expected: 29, label: "Thu", threshold: 22 },
      { actual: 14, expected: 25, label: "Fri", threshold: 22 },
    ];
  }

  return source
    .slice()
    .sort((left, right) => Date.parse(left.observed_at) - Date.parse(right.observed_at))
    .slice(-5)
    .map((item) => {
      const actual = item.rainfall_mm ?? 0;
      const expected = Math.round(actual * 1.22 + 8);
      const threshold = Math.max(18, Math.round(expected * 0.74));
      return {
        actual,
        expected,
        label: new Date(item.observed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        threshold,
      };
    });
}

function buildClaimRecords(
  policies: InsurancePolicyRecord[],
  alerts: ClimateAlertPayload[],
  evidence: ClimateEvidencePayload[],
  observations: ClimateObservationPayload[],
): InsuranceClaimDetailRecord[] {
  return policies.flatMap((policy) => {
    const relatedAlerts = alerts.filter((item) => item.farm_id === policy.field.farm_id);
    return relatedAlerts.map((alert, index) => {
      const status = claimStatusForAlert(alert);
      const matchingEvidence = evidence.filter(
        (item) =>
          item.farm_id === policy.field.farm_id &&
          ((item.alert_ids ?? []).includes(alert.alert_id) || (item.alert_ids ?? []).length === 0),
      );
      const rainfallPoints = buildRainfallPoints(observations, policy.field.farm_id);
      const claimAmount = Math.round(policy.coverage_amount * (status === "paid" ? 0.78 : 0.66));
      const attachments: InsuranceEvidenceAttachment[] = [
        {
          id: `${alert.alert_id}-weather`,
          label: "Weather trigger window",
          type: "climate_window",
          value: alert.headline ?? "Climate trigger detail",
        },
        {
          id: `${alert.alert_id}-satellite`,
          label: "Satellite confidence trace",
          type: "satellite",
          value: matchingEvidence[0]?.summary ?? "Satellite and station blend used for parametric verification.",
        },
      ];

      matchingEvidence.forEach((item, evidenceIndex) => {
        attachments.push({
          id: `${item.evidence_id}-${evidenceIndex}`,
          label: item.method_tag ? toTitleCase(item.method_tag) : "Field note",
          type: "field_note",
          value:
            item.assumptions?.[0] ??
            item.method_references?.[0] ??
            item.summary ??
            "Field evidence logged for this claim.",
        });
      });

      return {
        attachments,
        claim_amount: claimAmount,
        claim_id: `${policy.policy_id}-claim-${index + 1}`,
        coverage_amount: policy.coverage_amount,
        coverage_type: policy.coverage_type,
        currency: policy.currency,
        detail:
          alert.detail ??
          "The policy trigger threshold was exceeded for this insured field based on the latest weather window.",
        evidence_count: attachments.length,
        field: policy.field,
        payout_reference:
          status === "paid" ? `PAYOUT-${policy.field.farm_id.toUpperCase()}-${index + 1}` : "Pending payout release",
        payout_to: "AgroWallet",
        policy_id: policy.policy_id,
        rainfall_points: rainfallPoints,
        reported_at: alert.created_at,
        source_summary: matchingEvidence[0]?.summary ?? "Ghana Met Agency + AgroShield climate runtime",
        status,
        timeline: stageEntries(alert.created_at, status),
        title: alert.headline ?? `${coverageLabel(policy.coverage_type)} trigger`,
        trigger_condition:
          alert.alert_type === "heavy_rainfall"
            ? "Rainfall exceeded the configured flood threshold in the monitored source window."
            : "Observed climate conditions crossed the insured parametric threshold for this field.",
      };
    });
  });
}

function buildSeedClaimRecords(
  policies: InsurancePolicyRecord[],
  observations: ClimateObservationPayload[],
): InsuranceClaimDetailRecord[] {
  const primaryPolicy = policies[0];

  if (!primaryPolicy) {
    return [];
  }

  const reportedAt = "2026-04-18T08:30:00.000Z";
  const attachments: InsuranceEvidenceAttachment[] = [
    {
      id: `${primaryPolicy.policy_id}-seasonal-weather`,
      label: "Seasonal weather summary",
      type: "climate_window",
      value: "Rainfall and soil moisture trends for this insured field were reviewed across the covered period.",
    },
    {
      id: `${primaryPolicy.policy_id}-field-check`,
      label: "Field visit notes",
      type: "field_note",
      value: "Field checks confirmed the affected area and supported payout review for this policy.",
    },
    {
      id: `${primaryPolicy.policy_id}-satellite-check`,
      label: "Remote imagery check",
      type: "satellite",
      value: "Satellite imagery was used alongside station readings to confirm the claim outcome.",
    },
  ];

  return [
    {
      attachments,
      claim_amount: Math.round(primaryPolicy.coverage_amount * 0.58),
      claim_id: `${primaryPolicy.policy_id}-claim-review`,
      coverage_amount: primaryPolicy.coverage_amount,
      coverage_type: primaryPolicy.coverage_type,
      currency: primaryPolicy.currency,
      detail:
        "This recent claim review shows how weather evidence, field checks, and payout updates appear for an insured field.",
      evidence_count: attachments.length,
      field: primaryPolicy.field,
      payout_reference: `PAYOUT-${primaryPolicy.field.farm_id.toUpperCase()}-REVIEW`,
      payout_to: "AgroWallet",
      policy_id: primaryPolicy.policy_id,
      rainfall_points: buildRainfallPoints(observations, primaryPolicy.field.farm_id),
      reported_at: reportedAt,
      source_summary: "Seasonal rainfall records, field notes, and remote imagery were reviewed for this payout.",
      status: "paid",
      timeline: stageEntries(reportedAt, "paid"),
      title: `Recent claim review for ${primaryPolicy.field.farm_name}`,
      trigger_condition: "Weather conditions crossed the covered threshold during a recent insured period.",
    },
  ];
}

function buildFallbackField(sessionCountryCode: string | undefined): InsuranceFieldSummary[] {
  return [
    {
      crop_type: "Maize",
      district: sessionCountryCode === "NG" ? "Kaduna North" : "Tamale Metropolitan",
      farm_id: "field-fallback-001",
      farm_name: "AgroShield Demo Field",
      hectares: 8,
      latitude: null,
      longitude: null,
      risk_level: "guarded",
    },
  ];
}

export const insuranceApi = {
  async getDashboard(traceId: string): Promise<ResponseEnvelope<InsuranceDashboard>> {
    const session = readSession();
    if (!session) {
      throw new Error("session_missing");
    }

    const currency = currencyForCountry(session.actor.country_code);
    const walletSummary = await walletApi.getWalletSummary(traceId, currency).then((response) => response.data);

    const [alerts, evidence] = await Promise.all([
      requestJson<unknown>("/api/v1/climate/alerts", { method: "GET" }, traceId, true)
        .then((response) => unwrapCollection<ClimateAlertPayload>(response.data))
        .catch(() => []),
      requestJson<unknown>("/api/v1/climate/evidence", { method: "GET" }, traceId, true)
        .then((response) => unwrapCollection<ClimateEvidencePayload>(response.data))
        .catch(() => []),
    ]);

    const farmIds = Array.from(new Set(alerts.map((item) => item.farm_id).filter(Boolean)));
    const observations = (
      await Promise.all(
        farmIds.map((farmId) =>
          requestJson<unknown>(`/api/v1/climate/observations?farm_id=${encodeURIComponent(farmId)}`, { method: "GET" }, traceId, true)
            .then((response) => unwrapCollection<ClimateObservationPayload>(response.data))
            .catch(() => []),
        ),
      )
    ).flat();

    const fields = (() => {
      const liveFields = deriveFieldSummaries(alerts, observations, evidence);
      if (liveFields.length > 0) {
        return liveFields;
      }
      return buildFallbackField(session.actor.country_code);
    })();

    const storedPolicies = readStoredPolicies();
    const policies = (storedPolicies.length > 0 ? storedPolicies : buildSeedPolicies(fields, alerts, currency))
      .map((policy) => ({
        ...policy,
        active_claim_count: alerts.filter((item) => item.farm_id === policy.field.farm_id).length,
      }))
      .sort((left, right) => Date.parse(right.purchased_at) - Date.parse(left.purchased_at));
    const liveClaims = buildClaimRecords(policies, alerts, evidence, observations);
    const claims = (liveClaims.length > 0 ? liveClaims : buildSeedClaimRecords(policies, observations)).sort(
      (left, right) => Date.parse(right.reported_at) - Date.parse(left.reported_at),
    );
    const totalPremiumsReserved = policies.reduce((sum, item) => sum + item.premium_amount, 0);
    const totalPayoutsReceived = claims
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + item.claim_amount, 0);

    return responseEnvelope(
      {
        claims,
        fields,
        kpis: {
          active_claims: claims.filter((item) => item.status !== "paid").length,
          total_coverage: policies.reduce((sum, item) => sum + item.coverage_amount, 0),
          total_payouts_received: totalPayoutsReceived,
          total_premiums_reserved: totalPremiumsReserved,
        },
        policies,
        wallet: {
          available_after_reserve: Math.max(walletSummary.available_balance - totalPremiumsReserved, 0),
          available_balance: walletSummary.available_balance,
          currency: walletSummary.currency,
          total_balance: walletSummary.total_balance,
        },
      },
      traceId,
    );
  },

  async purchaseCoverage(input: PurchaseCoverageInput, traceId: string): Promise<ResponseEnvelope<InsurancePolicyRecord>> {
    const session = readSession();
    if (!session) {
      throw new Error("session_missing");
    }

    const dashboard = await this.getDashboard(traceId);
    const field =
      dashboard.data.fields.find((item) => item.farm_id === input.field_id) ??
      buildFallbackField(session.actor.country_code).find((item) => item.farm_id === input.field_id) ??
      dashboard.data.fields[0];

    if (!field) {
      throw new Error("farm_field_not_found");
    }

    if (dashboard.data.wallet.available_after_reserve < input.premium_amount) {
      throw new Error("insufficient_available_balance");
    }

    const policy: InsurancePolicyRecord = {
      active_claim_count: 0,
      coverage_amount: input.coverage_amount,
      coverage_type: input.coverage_type,
      coverage_window_label: input.coverage_window_label,
      currency: dashboard.data.wallet.currency,
      field,
      payment_reference: `AGROSHIELD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      policy_id: `policy-${crypto.randomUUID()}`,
      premium_amount: input.premium_amount,
      provider_name: "AgroShield Climate Pool",
      purchased_at: new Date().toISOString(),
      status: "active",
      weather_link_label: `Linked to ${field.farm_name} weather windows and climate evidence records.`,
    };

    const nextPolicies = [policy, ...readStoredPolicies()];
    writeStoredPolicies(nextPolicies);
    return responseEnvelope(policy, traceId);
  },

  async getClaimDetail(claimId: string, traceId: string): Promise<ResponseEnvelope<InsuranceClaimDetailRecord>> {
    const dashboard = await this.getDashboard(traceId);
    const claim = dashboard.data.claims.find((item) => item.claim_id === claimId);
    if (!claim) {
      throw new Error("claim_not_found");
    }
    return responseEnvelope(claim as InsuranceClaimDetailRecord, traceId);
  },
};

import type {
  AgroIntelligenceEntitySummary,
  AgroIntelligenceQueueCollection,
  IdentitySession,
} from "@agrodomain/contracts";
import { describe, expect, it } from "vitest";

import {
  buildCoverageBuckets,
  buildEntityBadges,
  buildEntityReason,
  collectBuyerFilterOptions,
  filterBuyerEntities,
  getWorkspaceBuckets,
  humanizeQueueReason,
  toggleShortlistItem,
} from "@/features/agro-intelligence/model";

function buildEntity(
  overrides: Partial<AgroIntelligenceEntitySummary> = {},
): AgroIntelligenceEntitySummary {
  return {
    canonical_name: "Green Harvest Foods",
    commodity_tags: ["maize", "soy"],
    confidence_score: 84,
    country_code: "GH",
    entity_id: "entity-1",
    entity_type: "organization",
    freshness_status: "fresh",
    lifecycle_state: "verified",
    location_signature: "Kumasi",
    operator_tags: ["buyer", "processor"],
    pending_claim_count: 0,
    source_document_count: 3,
    source_tier: "A",
    trust_tier: "gold",
    updated_at: "2026-04-29T00:00:00.000Z",
    ...overrides,
  };
}

function buildSession(role: IdentitySession["actor"]["role"]): IdentitySession {
  return {
    actor: {
      actor_id: "actor-1",
      country_code: "GH",
      display_name: "Ama Mensah",
      email: "ama@example.com",
      locale: "en-GH",
      membership: {
        organization_id: "org-1",
        organization_name: "Northern Co-op",
        role,
      },
      role,
    },
    available_roles: [role],
    consent: {
      actor_id: "actor-1",
      captured_at: "2026-04-29T00:00:00.000Z",
      channel: "pwa",
      country_code: "GH",
      policy_version: "2026.04",
      revoked_at: null,
      scope_ids: ["identity.core"],
      state: "consent_granted",
    },
    workspace: {
      data_origin: "synthetic_demo",
      environment_scope: "shared_demo_tenant",
      is_demo_tenant: true,
      operator_can_switch_personas: true,
      suppressed_rails: [],
      tenant_id: "tenant-1",
      tenant_label: "Demo",
      watermark: "Demo data",
    },
  };
}

describe("agro-intelligence model helpers", () => {
  it("keeps the strongest buyer matches first for farmer-facing search", () => {
    const items = filterBuyerEntities(
      [
        buildEntity({ canonical_name: "Northern Dry Stores", trust_tier: "bronze", source_tier: "C" }),
        buildEntity(),
      ],
      {
        buyerType: "",
        commodity: "maize",
        freshness: "",
        location: "",
        query: "",
        trustTier: "",
      },
      buildSession("farmer").actor.role,
    );

    expect(items[0]?.canonical_name).toBe("Green Harvest Foods");
  });

  it("builds trust-oriented badges and explainability text", () => {
    const entity = buildEntity();
    const badges = buildEntityBadges(entity, { isDemo: true });
    const reason = buildEntityReason(entity, "cooperative");

    expect(badges.map((badge) => badge.label)).toEqual(
      expect.arrayContaining(["Trusted", "Fresh", "Multi-source", "Source checked", "Demo data"]),
    );
    expect(reason).toContain("shortlist candidate");
  });

  it("extracts filter options and coverage clusters from the same read model", () => {
    const options = collectBuyerFilterOptions([
      buildEntity(),
      buildEntity({
        canonical_name: "Tamale Grain Traders",
        commodity_tags: ["rice"],
        location_signature: "Tamale",
        operator_tags: ["trader"],
      }),
    ]);
    const coverage = buildCoverageBuckets([
      buildEntity(),
      buildEntity({ entity_id: "entity-2", canonical_name: "Kumasi Mills" }),
    ]);

    expect(options.buyerTypes).toEqual(expect.arrayContaining(["processor", "trader"]));
    expect(options.commodities).toEqual(expect.arrayContaining(["maize", "rice"]));
    expect(coverage[0]).toMatchObject({ buyerCount: 2, label: "Kumasi" });
  });

  it("groups operator queue records into review buckets", () => {
    const queue: AgroIntelligenceQueueCollection = {
      count: 2,
      country_code: "GH",
      items: [
        {
          canonical_name: "Green Harvest Foods",
          confidence_score: 70,
          country_code: "GH",
          entity_id: "entity-1",
          entity_type: "organization",
          freshness_status: "watch",
          lifecycle_state: "pending_verification",
          operator_tags: ["buyer"],
          priority_score: 56,
          reasons: ["ambiguous_duplicate_candidate", "pending_rule_claim"],
          trust_tier: "silver",
          updated_at: "2026-04-29T00:00:00.000Z",
        },
        {
          canonical_name: "Northern Aggregators",
          confidence_score: 58,
          country_code: "GH",
          entity_id: "entity-2",
          entity_type: "organization",
          freshness_status: "stale",
          lifecycle_state: "stale",
          operator_tags: ["buyer"],
          priority_score: 62,
          reasons: ["freshness_stale", "low_confidence_score"],
          trust_tier: "bronze",
          updated_at: "2026-04-29T00:00:00.000Z",
        },
      ],
      schema_version: "2026-04-18.wave1",
    };

    const buckets = getWorkspaceBuckets(queue);

    expect(buckets.find((bucket) => bucket.id === "duplicates")?.items).toHaveLength(1);
    expect(buckets.find((bucket) => bucket.id === "stale")?.items).toHaveLength(1);
    expect(humanizeQueueReason("freshness_stale")).toBe("Stale record");
  });

  it("toggles shortlist items without duplication", () => {
    const shortlisted = toggleShortlistItem(["entity-1"], "entity-2");
    const removed = toggleShortlistItem(shortlisted, "entity-1");

    expect(shortlisted).toEqual(["entity-1", "entity-2"]);
    expect(removed).toEqual(["entity-2"]);
  });
});

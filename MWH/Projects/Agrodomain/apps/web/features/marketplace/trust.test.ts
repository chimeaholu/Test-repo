import type { ListingRecord, NegotiationThreadRead } from "@agrodomain/contracts";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { escrowReadSchema } from "@agrodomain/contracts";

import type { ListingWizardDraft } from "@/components/marketplace/listing-wizard/types";
import {
  buildEscrowExplainability,
  buildListingTrustSummary,
  buildListingWizardGuidance,
  buildNegotiationGuidance,
  buildNegotiationTrustSummary,
} from "@/features/marketplace/trust";

type EscrowReadModel = z.infer<typeof escrowReadSchema>;

function buildDraft(overrides: Partial<ListingWizardDraft> = {}): ListingWizardDraft {
  return {
    title: "Premium cassava harvest",
    commodity: "Cassava",
    varietyGrade: "Grade A",
    category: "Root crop",
    description: "Bagged cassava stock with moisture proof and ready pickup note.",
    priceAmount: "320",
    priceCurrency: "GHS",
    quantityTons: "4.2",
    minimumOrderQuantity: "1",
    pricingType: "negotiable",
    availabilityStart: "2026-04-25",
    availabilityEnd: "2026-05-10",
    locationPreset: "Tamale, Northern Region",
    locationManual: "",
    deliveryMode: "both",
    photos: [
      {
        id: "photo-1",
        mimeType: "image/jpeg",
        name: "harvest.jpg",
        previewUrl: "data:image/jpeg;base64,abc",
        rotation: 0,
        size: 1024,
      },
    ],
    ...overrides,
  };
}

function buildListing(overrides: Partial<ListingRecord> = {}): ListingRecord {
  return {
    schema_version: "2026-04-18.wave1",
    listing_id: "listing-1",
    actor_id: "actor-seller",
    country_code: "GH",
    title: "Premium cassava harvest",
    commodity: "Cassava",
    quantity_tons: 4.2,
    price_amount: 320,
    price_currency: "GHS",
    location: "Tamale, Northern Region",
    summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
    status: "published",
    revision_number: 2,
    published_revision_number: 2,
    revision_count: 2,
    has_unpublished_changes: false,
    view_scope: "buyer_safe",
    published_at: "2026-04-18T00:00:00.000Z",
    created_at: "2026-04-18T00:00:00.000Z",
    updated_at: "2026-04-19T06:00:00.000Z",
    ...overrides,
  };
}

function buildThread(overrides: Partial<NegotiationThreadRead> = {}): NegotiationThreadRead {
  return {
    schema_version: "2026-04-18.wave1",
    thread_id: "thread-1",
    listing_id: "listing-1",
    seller_actor_id: "actor-seller",
    buyer_actor_id: "actor-buyer",
    country_code: "GH",
    status: "accepted",
    current_offer_amount: 420,
    current_offer_currency: "GHS",
    last_action_at: "2026-04-20T08:00:00.000Z",
    created_at: "2026-04-20T06:00:00.000Z",
    updated_at: "2026-04-20T08:00:00.000Z",
    confirmation_checkpoint: null,
    messages: [
      {
        schema_version: "2026-04-18.wave1",
        actor_id: "actor-buyer",
        action: "offer_created",
        amount: 400,
        currency: "GHS",
        note: "Opening offer",
        created_at: "2026-04-20T06:00:00.000Z",
      },
      {
        schema_version: "2026-04-18.wave1",
        actor_id: "actor-seller",
        action: "offer_countered",
        amount: 420,
        currency: "GHS",
        note: "Counter offer",
        created_at: "2026-04-20T08:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function buildEscrow(overrides: Partial<EscrowReadModel> = {}): EscrowReadModel {
  return {
    schema_version: "2026-04-18.wave1",
    escrow_id: "escrow-1",
    thread_id: "thread-1",
    listing_id: "listing-1",
    buyer_actor_id: "actor-buyer",
    seller_actor_id: "actor-seller",
    country_code: "GH",
    currency: "GHS",
    amount: 420,
    state: "funded",
    partner_reference: null,
    partner_reason_code: null,
    funded_at: "2026-04-20T10:00:00.000Z",
    released_at: null,
    reversed_at: null,
    disputed_at: null,
    created_at: "2026-04-20T09:00:00.000Z",
    updated_at: "2026-04-20T10:00:00.000Z",
    timeline: [],
    ...overrides,
  };
}

describe("marketplace trust helpers", () => {
  it("summarizes the listing wizard with blockers when trust detail is missing", () => {
    const guidance = buildListingWizardGuidance(
      "basic",
      buildDraft({
        description: "Cassava ready.",
        title: "CC",
      }),
    );

    expect(guidance.title).toBe("Make the lot easy to recognize");
    expect(guidance.blockers).toContain("Use a more specific lot title.");
    expect(guidance.blockers).toContain("Mention packaging, grade, or another quality proof in the description.");
  });

  it("builds buyer-safe trust signals from the listing surface", () => {
    const summary = buildListingTrustSummary({
      listing: buildListing(),
      viewerRole: "buyer",
      visibleListingCount: 3,
      now: new Date("2026-04-19T12:00:00.000Z"),
    });

    expect(summary.title).toBe("Counterparty trust snapshot");
    expect(summary.signals.find((signal) => signal.label === "Visible history")?.value).toBe("3 visible listings");
    expect(summary.signals.find((signal) => signal.label === "Quality proof")?.value).toBe("Handling proof referenced");
  });

  it("pushes buyers toward escrow once terms are accepted", () => {
    const guidance = buildNegotiationGuidance({
      actorId: "actor-buyer",
      escrow: null,
      now: new Date("2026-04-21T04:00:00.000Z"),
      thread: buildThread(),
    });

    expect(guidance.title).toBe("Terms are accepted");
    expect(guidance.primaryActionLabel).toBe("Create escrow now");
    expect(guidance.blockerLabel).toContain("not protected");
  });

  it("switches negotiation guidance once escrow funding is complete", () => {
    const guidance = buildNegotiationGuidance({
      actorId: "actor-seller",
      escrow: buildEscrow(),
      now: new Date("2026-04-21T04:00:00.000Z"),
      thread: buildThread(),
    });
    const trustSummary = buildNegotiationTrustSummary({
      actorId: "actor-seller",
      escrow: buildEscrow(),
      now: new Date("2026-04-21T04:00:00.000Z"),
      thread: buildThread(),
    });

    expect(guidance.primaryActionLabel).toBe("Release only after proof");
    expect(trustSummary.signals.find((signal) => signal.label === "Commitment state")?.value).toBe("Escrow funded");
  });

  it("explains who acts next on a blocked escrow", () => {
    const explainability = buildEscrowExplainability(
      buildEscrow({
        partner_reason_code: "delivery_failed",
        state: "partner_pending",
      }),
      "actor-buyer",
    );

    expect(explainability.fundsLocation).toContain("unresolved");
    expect(explainability.nextOwnerLabel).toBe("Buyer should retry or reverse");
    expect(explainability.blocker).toContain("pause");
  });
});

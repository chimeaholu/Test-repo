import type {
  ListingRecord,
  MarketplaceIntelligenceEntityMatch,
  MarketplaceListingIntelligenceRead,
  MarketplaceNegotiationIntelligenceRead,
  NegotiationThreadRead,
} from "@agrodomain/contracts";

import type {
  ListingWizardDraft,
  ListingWizardStepId,
} from "@/components/marketplace/listing-wizard/types";
import type { EscrowReadModel } from "@/features/wallet/model";

type SignalTone = "online" | "offline" | "degraded" | "neutral";

export type TrustSignal = {
  detail: string;
  label: string;
  tone: SignalTone;
  value: string;
};

export type ListingWizardGuidance = {
  blockers: string[];
  body: string;
  nextActionLabel: string;
  readinessLabel: string;
  readinessScore: number;
  title: string;
  trustSignals: TrustSignal[];
};

export type TransactionGuidance = {
  blockerLabel: string;
  body: string;
  checklist: string[];
  primaryActionLabel: string;
  title: string;
  tone: SignalTone;
  urgencyLabel: string;
};

export type CounterpartyTrustSummary = {
  signals: TrustSignal[];
  summary: string;
  title: string;
};

export type EscrowExplainability = {
  blocker: string;
  fundsLocation: string;
  nextOwnerLabel: string;
  releaseCondition: string;
  statusSummary: string;
};

export type MarketplaceMatchGuidance = {
  body: string;
  title: string;
  tone: SignalTone;
};

function hasText(value: string | null | undefined, minLength = 1): boolean {
  return Boolean(value && value.trim().length >= minLength);
}

function moneyReady(value: string): boolean {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0;
}

function buildLocation(draft: ListingWizardDraft): string {
  return draft.locationManual.trim() || draft.locationPreset.trim();
}

function qualityProofMentioned(input: string): boolean {
  return /(grade|moisture|bag|sack|crate|sorted|dry|clean|certified|proof)/iu.test(input);
}

function deliveryLabel(mode: ListingWizardDraft["deliveryMode"]): string {
  if (mode === "pickup") {
    return "Pickup only";
  }
  if (mode === "delivery") {
    return "Delivery only";
  }
  return "Pickup or delivery";
}

function stepBlockers(step: ListingWizardStepId, draft: ListingWizardDraft): string[] {
  const blockers: string[] = [];

  if ((step === "basic" || step === "review") && !hasText(draft.title, 3)) {
    blockers.push("Use a more specific lot title.");
  }
  if ((step === "basic" || step === "review") && !qualityProofMentioned(draft.description)) {
    blockers.push("Mention packaging, grade, or another quality proof in the description.");
  }
  if ((step === "pricing" || step === "review") && !moneyReady(draft.priceAmount)) {
    blockers.push("Set a buyer-facing asking price.");
  }
  if ((step === "pricing" || step === "review") && !moneyReady(draft.minimumOrderQuantity)) {
    blockers.push("Set the smallest order you will accept.");
  }
  if (
    (step === "pricing" || step === "review") &&
    moneyReady(draft.quantityTons) &&
    moneyReady(draft.minimumOrderQuantity) &&
    Number(draft.minimumOrderQuantity) > Number(draft.quantityTons)
  ) {
    blockers.push("Minimum order quantity cannot be larger than total volume.");
  }
  if ((step === "media" || step === "review") && !hasText(buildLocation(draft), 3)) {
    blockers.push("Add the exact pickup or delivery location.");
  }
  if ((step === "media" || step === "review") && draft.photos.length === 0) {
    blockers.push("Add at least one photo or be ready to explain quality in negotiation.");
  }
  if ((step === "media" || step === "review") && !draft.deliveryMode) {
    blockers.push("Choose how the lot can move after sale.");
  }

  return blockers;
}

function listingReadinessScore(draft: ListingWizardDraft): number {
  const checks = [
    hasText(draft.title, 3),
    hasText(draft.commodity, 2),
    hasText(draft.varietyGrade, 2),
    hasText(draft.description, 12),
    moneyReady(draft.priceAmount),
    moneyReady(draft.quantityTons),
    moneyReady(draft.minimumOrderQuantity),
    hasText(buildLocation(draft), 3),
    draft.photos.length > 0,
    Boolean(draft.availabilityStart && draft.availabilityEnd),
  ];

  const passedChecks = checks.filter(Boolean).length;
  return Math.round((passedChecks / checks.length) * 100);
}

function freshnessLabel(timestamp: string, now: Date): string {
  const diffHours = Math.max(0, Math.round((now.getTime() - new Date(timestamp).getTime()) / (1000 * 60 * 60)));
  if (diffHours < 12) {
    return "Updated today";
  }
  if (diffHours < 48) {
    return "Updated in the last 2 days";
  }
  const diffDays = Math.max(1, Math.round(diffHours / 24));
  return `${diffDays} days since the last action`;
}

function roleLabel(role: "buyer" | "seller"): string {
  return role === "buyer" ? "Buyer" : "Seller";
}

function matchSignalLabel(match: MarketplaceIntelligenceEntityMatch): string {
  return match.operator_tags.some((tag) => BUYER_LIKE_TAGS.has(tag.toLowerCase())) ? "Verified buyer record" : "Verified entity record";
}

const BUYER_LIKE_TAGS = new Set(["buyer", "processor", "offtaker"]);

function buildEntityMatchSignals(match: MarketplaceIntelligenceEntityMatch): TrustSignal[] {
  return [
    {
      detail: "This marketplace actor resolved to a verified market profile instead of a raw session-only identity record.",
      label: matchSignalLabel(match),
      tone: match.trust_tier === "gold" ? "online" : match.trust_tier === "silver" ? "neutral" : "degraded",
      value: `${match.canonical_name} · ${match.trust_tier}`,
    },
    {
      detail: "Fresh profile evidence is safer for negotiations than stale directory context.",
      label: "Profile freshness",
      tone: match.freshness_status === "fresh" ? "online" : match.freshness_status === "watch" ? "neutral" : "degraded",
      value: match.freshness_status,
    },
    {
      detail: "Source documents and unresolved claims show how much operator review is still attached to this record.",
      label: "Evidence posture",
      tone: match.pending_claim_count > 0 ? "degraded" : "online",
      value: `${match.source_document_count} source docs · ${match.pending_claim_count} pending claims`,
    },
  ];
}

export function mergeListingTrustSummaryWithIntelligence(
  summary: CounterpartyTrustSummary,
  intelligence: MarketplaceListingIntelligenceRead | null,
): CounterpartyTrustSummary {
  if (!intelligence?.seller_entity_match) {
    return summary;
  }
  return {
    ...summary,
    signals: [...summary.signals, ...buildEntityMatchSignals(intelligence.seller_entity_match)],
    summary: "Marketplace identity signals now include the resolved seller profile match when the account can be linked safely.",
  };
}

export function mergeNegotiationTrustSummaryWithIntelligence(
  summary: CounterpartyTrustSummary,
  intelligence: MarketplaceNegotiationIntelligenceRead | null,
): CounterpartyTrustSummary {
  if (!intelligence?.counterparty_entity_match) {
    return summary;
  }
  return {
    ...summary,
    signals: [...summary.signals, ...buildEntityMatchSignals(intelligence.counterparty_entity_match)],
    summary: "This thread now carries the resolved counterparty profile match when the actor can be linked safely.",
  };
}

export function buildListingMatchGuidance(params: {
  intelligence: MarketplaceListingIntelligenceRead;
  listing: ListingRecord;
}): MarketplaceMatchGuidance {
  const topMatch = params.intelligence.buyer_matches[0];
  if (!topMatch) {
    return {
      body: `No verified buyer record cleanly matches ${params.listing.commodity.toLowerCase()} for this lane yet. Publish the lot, then review buyer profiles for manual outreach.`,
      title: "No verified buyer match yet",
      tone: "neutral",
    };
  }
  return {
    body: `${params.intelligence.matched_buyer_count} verified buyer record${params.intelligence.matched_buyer_count === 1 ? "" : "s"} align with this lot. Start with ${topMatch.canonical_name} while demand is still warm.`,
    title: "Verified buyers already cover this lane",
    tone: "online",
  };
}

export function buildListingWizardGuidance(
  step: ListingWizardStepId,
  draft: ListingWizardDraft,
): ListingWizardGuidance {
  const blockers = stepBlockers(step, draft);
  const readinessScore = listingReadinessScore(draft);
  const location = buildLocation(draft);

  if (step === "basic") {
    return {
      blockers,
      body:
        blockers.length > 0
          ? "Start with a lot title and description that make the stock easy to trust before you talk about price."
          : "The lot identity is clear enough to move into commercial terms next.",
      nextActionLabel: "Set the price, volume, and minimum order.",
      readinessLabel: `${readinessScore}% buyer-ready`,
      readinessScore,
      title: "Make the lot easy to recognize",
      trustSignals: [
        {
          detail: "Buyers act faster when the title tells them what is being sold and in what condition.",
          label: "Lot identity",
          tone: hasText(draft.title, 3) ? "online" : "degraded",
          value: hasText(draft.title, 3) ? "Specific title added" : "Title still vague",
        },
        {
          detail: "Commodity plus variety or grade reduces follow-up questions.",
          label: "Quality framing",
          tone: hasText(draft.varietyGrade, 2) ? "online" : "degraded",
          value: hasText(draft.varietyGrade, 2) ? draft.varietyGrade : "Grade not stated",
        },
        {
          detail: "Buyers need proof language even before photos or lab data are present.",
          label: "Trust detail",
          tone: qualityProofMentioned(draft.description) ? "online" : "neutral",
          value: qualityProofMentioned(draft.description) ? "Quality proof mentioned" : "Add handling proof",
        },
      ],
    };
  }

  if (step === "pricing") {
    return {
      blockers,
      body:
        blockers.length > 0
          ? "Clear commercial terms prevent low-quality negotiations later."
          : "The offer terms are structured well enough for buyers to understand the deal shape.",
      nextActionLabel: "Add delivery and location details buyers can plan against.",
      readinessLabel: `${readinessScore}% buyer-ready`,
      readinessScore,
      title: "Set commercial terms a buyer can act on",
      trustSignals: [
        {
          detail: "A visible asking price anchors negotiation and prevents low-trust offers.",
          label: "Asking price",
          tone: moneyReady(draft.priceAmount) ? "online" : "degraded",
          value: moneyReady(draft.priceAmount) ? `${draft.priceAmount} ${draft.priceCurrency}` : "Price missing",
        },
        {
          detail: "MOQ tells buyers if the lot fits their transport and storage plan.",
          label: "Order size",
          tone: moneyReady(draft.minimumOrderQuantity) ? "online" : "degraded",
          value: moneyReady(draft.minimumOrderQuantity)
            ? `MOQ ${draft.minimumOrderQuantity} tons`
            : "MOQ missing",
        },
        {
          detail: "Pricing mode tells buyers whether to accept, negotiate, or wait for an auction.",
          label: "Pricing posture",
          tone: "neutral",
          value: draft.pricingType === "fixed" ? "Fixed deal" : draft.pricingType === "auction" ? "Auction flow" : "Negotiable terms",
        },
      ],
    };
  }

  if (step === "media") {
    return {
      blockers,
      body:
        blockers.length > 0
          ? "Delivery uncertainty is the main reason accepted deals stall, so close that gap before publishing."
          : "A buyer can now picture where the lot is and how it can move.",
      nextActionLabel: "Run the final trust check and publish when ready.",
      readinessLabel: `${readinessScore}% buyer-ready`,
      readinessScore,
      title: "Remove logistics uncertainty",
      trustSignals: [
        {
          detail: "Photos reduce back-and-forth when the buyer is not physically at the farm or warehouse.",
          label: "Visual proof",
          tone: draft.photos.length > 0 ? "online" : "neutral",
          value: draft.photos.length > 0 ? `${draft.photos.length} photo${draft.photos.length === 1 ? "" : "s"}` : "No photo yet",
        },
        {
          detail: "Pickup points and districts are required for serious logistics planning.",
          label: "Location clarity",
          tone: hasText(location, 3) ? "online" : "degraded",
          value: hasText(location, 3) ? location : "Location missing",
        },
        {
          detail: "Delivery mode prevents mismatched expectations after the first offer.",
          label: "Movement plan",
          tone: draft.deliveryMode ? "online" : "degraded",
          value: deliveryLabel(draft.deliveryMode),
        },
      ],
    };
  }

  return {
    blockers,
    body:
      blockers.length > 0
        ? "Clear the remaining blockers before publishing so the first buyer conversation starts from a trusted base."
        : "This listing now has enough structure to move into live negotiation and escrow safely.",
    nextActionLabel: blockers.length > 0 ? "Clear the blockers, then publish." : "Publish the listing and watch for the first offer.",
    readinessLabel: `${readinessScore}% buyer-ready`,
    readinessScore,
    title: "Final trust check before publish",
    trustSignals: [
      {
        detail: "Title, proof language, and grade should already give buyers context before they message you.",
        label: "Lot story",
        tone: blockers.some((item) => item.includes("title") || item.includes("proof")) ? "degraded" : "online",
        value: blockers.some((item) => item.includes("title") || item.includes("proof"))
          ? "Needs polish"
          : "Clear buyer-facing summary",
      },
      {
        detail: "Commercial terms must already answer quantity, price, and MOQ questions.",
        label: "Trade terms",
        tone: blockers.some((item) => item.includes("price") || item.includes("order")) ? "degraded" : "online",
        value: `${draft.quantityTons || "0"} tons at ${draft.priceAmount || "0"} ${draft.priceCurrency || "---"}`,
      },
      {
        detail: "Location and movement details make the first accepted deal easier to settle.",
        label: "Execution readiness",
        tone: blockers.some((item) => item.includes("location") || item.includes("photo")) ? "degraded" : "online",
        value: hasText(location, 3) ? `${location} · ${deliveryLabel(draft.deliveryMode)}` : "Needs delivery detail",
      },
    ],
  };
}

export function buildListingTrustSummary(params: {
  listing: ListingRecord;
  viewerRole: string;
  visibleListingCount?: number | null;
  now?: Date;
}): CounterpartyTrustSummary {
  const now = params.now ?? new Date();
  const listingCountLabel =
    typeof params.visibleListingCount === "number" ? `${params.visibleListingCount} visible listing${params.visibleListingCount === 1 ? "" : "s"}` : "Private seller history";

  return {
    signals: [
      {
        detail: "Identity is still routed through the marketplace actor model, but the listing is attached to a signed-in seller account.",
        label: "Identity",
        tone: "online",
        value: params.viewerRole === "buyer" ? "Verified marketplace seller" : "Verified owner account",
      },
      {
        detail: "Published and revision-tracked listings are safer than ad-hoc messages with no trace.",
        label: "Listing discipline",
        tone: params.listing.status === "published" ? "online" : "degraded",
        value: `${params.listing.revision_count} revision${params.listing.revision_count === 1 ? "" : "s"} tracked`,
      },
      {
        detail: "The trade lane matters for delivery planning, payment timing, and who should inspect first.",
        label: "Trade lane",
        tone: "neutral",
        value: params.listing.country_code === "NG" ? "Nigeria" : params.listing.country_code === "GH" ? "Ghana" : params.listing.country_code,
      },
      {
        detail: "Repeated public inventory is a better signal than a one-off listing with no visible history.",
        label: "Visible history",
        tone: typeof params.visibleListingCount === "number" && params.visibleListingCount > 0 ? "online" : "neutral",
        value: listingCountLabel,
      },
      {
        detail: "The summary should already hint at whether inspection will rely on packaging, moisture, or grade evidence.",
        label: "Quality proof",
        tone: qualityProofMentioned(params.listing.summary) ? "online" : "neutral",
        value: qualityProofMentioned(params.listing.summary) ? "Handling proof referenced" : "Confirm in negotiation",
      },
      {
        detail: "Fresh activity reduces the risk of negotiating against stale inventory.",
        label: "Freshness",
        tone: freshnessLabel(params.listing.updated_at, now).includes("days") ? "neutral" : "online",
        value: freshnessLabel(params.listing.updated_at, now),
      },
    ],
    summary:
      params.listing.status === "published"
        ? "This lot is live, revision-tracked, and ready for offers under the current marketplace rules."
        : "This lot is still private or closed, so trust signals are visible but buyer discovery is limited.",
    title: "Counterparty trust snapshot",
  };
}

export function buildNegotiationGuidance(params: {
  actorId: string;
  escrow: EscrowReadModel | null;
  now?: Date;
  thread: NegotiationThreadRead;
}): TransactionGuidance {
  const now = params.now ?? new Date();
  const isBuyer = params.actorId === params.thread.buyer_actor_id;
  const deadlineAt = new Date(new Date(params.thread.last_action_at).getTime() + 48 * 60 * 60 * 1000);
  const hoursUntilDeadline = Math.round((deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60));
  const urgencyLabel =
    hoursUntilDeadline < 0
      ? `Response overdue by ${Math.abs(Math.round(hoursUntilDeadline / 24) || 1)} day(s)`
      : hoursUntilDeadline <= 12
        ? `Reply within ${Math.max(1, hoursUntilDeadline)} hour(s)`
        : `Decision window closes in about ${Math.max(1, Math.round(hoursUntilDeadline / 24))} day(s)`;

  if (params.escrow) {
    if (params.escrow.state === "partner_pending") {
      return {
        blockerLabel: "Delivery should pause until funding is confirmed.",
        body: isBuyer
          ? "The accepted deal has an escrow record, but the payment partner has not confirmed the funds yet."
          : "The deal is accepted, but the buyer's funding step is still unresolved, so the settlement is not safe to release.",
        checklist: [
          isBuyer ? "Retry funding or reverse the escrow if the buyer wants to stop." : "Wait for the buyer to retry funding or for the escrow to be reversed.",
          "Check the latest payment notification for fallback or action-required status.",
          "Do not treat this deal as dispatch-ready yet.",
        ],
        primaryActionLabel: isBuyer ? "Retry funding now" : "Wait for buyer funding",
        title: "Funding is blocked",
        tone: "degraded",
        urgencyLabel,
      };
    }

    if (params.escrow.state === "funded") {
      return {
        blockerLabel: isBuyer
          ? "Do not release until delivery proof is in place."
          : "Seller release should happen only after delivery is confirmed.",
        body: "The funds are already protected in escrow, so the next action is about delivery proof and controlled release rather than price negotiation.",
        checklist: [
          isBuyer ? "Track delivery or inspection before approving release." : "Collect delivery proof before releasing settlement.",
          "Keep any dispute or reversal tied to the same escrow record.",
          "Use the wallet timeline if any payment or logistics step becomes unclear.",
        ],
        primaryActionLabel: isBuyer ? "Track delivery before release" : "Release only after proof",
        title: "Funds are secure",
        tone: "online",
        urgencyLabel,
      };
    }

    if (params.escrow.state === "released") {
      return {
        blockerLabel: "No further settlement action is required.",
        body: "This negotiation already completed settlement, so the remaining work is record-keeping or support follow-up.",
        checklist: [
          "Review the settlement timeline if anyone asks for payment proof.",
          "Use support only if a dispute appears after release.",
          "Treat the thread as a closed record.",
        ],
        primaryActionLabel: "Archive as completed",
        title: "Settlement completed",
        tone: "online",
        urgencyLabel: "Completed",
      };
    }

    if (params.escrow.state === "reversed") {
      return {
        blockerLabel: "The deal is no longer funded.",
        body: "The escrow has been reversed, so both parties need a new agreement before any payment can move again.",
        checklist: [
          "Confirm why the reversal happened before restarting the deal.",
          "Create a fresh negotiation if the commercial terms changed.",
          "Do not ship against a reversed escrow.",
        ],
        primaryActionLabel: "Restart terms only if needed",
        title: "Funds were returned",
        tone: "neutral",
        urgencyLabel: "Escrow closed",
      };
    }

    if (params.escrow.state === "disputed") {
      return {
        blockerLabel: "The funds are frozen until the dispute is resolved.",
        body: "A dispute is open, so neither party should continue delivery or release steps outside the recorded timeline.",
        checklist: [
          "Keep all evidence tied to the dispute note and wallet timeline.",
          "Do not release or reverse outside the approved workflow.",
          "Escalate only after both parties confirm the blocker clearly.",
        ],
        primaryActionLabel: "Prepare evidence for review",
        title: "Dispute handling is in progress",
        tone: "offline",
        urgencyLabel: "Escalate with evidence",
      };
    }
  }

  if (params.thread.status === "pending_confirmation") {
    const isConfirmer =
      params.thread.confirmation_checkpoint?.required_confirmer_actor_id === params.actorId;
    return {
      blockerLabel: isConfirmer
        ? "The trade cannot move into escrow until you decide."
        : "The thread is paused until the named confirmer responds.",
      body: isConfirmer
        ? "You are the final confirmer on this thread. Approve only if the quantity, price, quality, and delivery assumptions are now clear."
        : "The commercial terms are set, but the final confirmer has not approved the thread yet.",
      checklist: [
        "Check the last offer amount and note before deciding.",
        "Confirm who is responsible for delivery and inspection.",
        "Do not start escrow until the checkpoint is resolved.",
      ],
      primaryActionLabel: isConfirmer ? "Approve or reject now" : "Wait for final confirmation",
      title: "Final confirmation is waiting",
      tone: isConfirmer ? "degraded" : "neutral",
      urgencyLabel,
    };
  }

  if (params.thread.status === "accepted") {
    return {
      blockerLabel: isBuyer
        ? "The deal is accepted but not protected until escrow starts."
        : "Wait for escrow before dispatch or settlement promises.",
      body: isBuyer
        ? "Commercial terms are accepted. The next safe move is to start escrow so the seller knows the payment is protected."
        : "Commercial terms are accepted. The seller should wait for the buyer to secure the deal in escrow before moving product.",
      checklist: [
        isBuyer ? "Start escrow from this thread." : "Watch for the escrow to appear in AgroWallet.",
        "Keep delivery promises tied to the wallet timeline once escrow exists.",
        "Use the negotiation notes only for commercial context, not payment proof.",
      ],
      primaryActionLabel: isBuyer ? "Create escrow now" : "Wait for buyer escrow",
      title: "Terms are accepted",
      tone: isBuyer ? "degraded" : "neutral",
      urgencyLabel,
    };
  }

  if (params.thread.status === "rejected") {
    return {
      blockerLabel: "This thread is closed to new price changes.",
      body: "The negotiation ended without agreement, so a new thread is required if both parties want to revisit the deal.",
      checklist: [
        "Review why the terms failed before starting again.",
        "Only create a new thread if the commercial assumptions changed.",
        "Treat this conversation as a historical record.",
      ],
      primaryActionLabel: "Open a new thread only if terms change",
      title: "Negotiation closed without agreement",
      tone: "neutral",
      urgencyLabel: "Closed",
    };
  }

  return {
    blockerLabel: isBuyer
      ? "Waiting on seller response or a new buyer move."
      : "The next price move is on the seller unless the current offer is already acceptable.",
    body: isBuyer
      ? "Your offer is live. Use this thread to keep the conversation tied to one amount, one counterparty, and one clear record."
      : "The buyer has an open offer on the table. Counter, request final confirmation, or keep the thread moving before it goes stale.",
    checklist: [
      "Review the current amount against the lot and delivery terms.",
      isBuyer ? "Wait for a seller counter or change your buyer note if the lot assumptions changed." : "Counter clearly if the amount, grade, or delivery split still needs work.",
      "Keep inspection, logistics, and payment questions visible in the thread.",
    ],
    primaryActionLabel: isBuyer ? "Wait for seller response" : "Counter or confirm terms",
    title: isBuyer ? "Your opening offer is active" : "Buyer offer needs your response",
    tone: hoursUntilDeadline <= 12 ? "degraded" : "neutral",
    urgencyLabel,
  };
}

export function buildNegotiationTrustSummary(params: {
  actorId: string;
  escrow: EscrowReadModel | null;
  now?: Date;
  thread: NegotiationThreadRead;
}): CounterpartyTrustSummary {
  const now = params.now ?? new Date();
  const counterpartyRole = params.actorId === params.thread.buyer_actor_id ? "seller" : "buyer";

  return {
    signals: [
      {
        detail: "Role clarity matters because the next action changes depending on who controls price, confirmation, and release.",
        label: "Counterparty role",
        tone: "online",
        value: roleLabel(counterpartyRole),
      },
      {
        detail: "Message count is a rough signal for how much context already lives inside the thread.",
        label: "Thread history",
        tone: params.thread.messages.length >= 2 ? "online" : "neutral",
        value: `${params.thread.messages.length} timeline update${params.thread.messages.length === 1 ? "" : "s"}`,
      },
      {
        detail: "Fresh threads are less likely to be negotiating against stale stock or stale pricing assumptions.",
        label: "Latest activity",
        tone: freshnessLabel(params.thread.last_action_at, now).includes("days") ? "neutral" : "online",
        value: freshnessLabel(params.thread.last_action_at, now),
      },
      {
        detail: "Confirmation and escrow status tell you whether the counterparty has moved beyond discussion into commitment.",
        label: "Commitment state",
        tone: params.escrow
          ? params.escrow.state === "funded" || params.escrow.state === "released"
            ? "online"
            : "degraded"
          : params.thread.status === "accepted"
            ? "degraded"
            : "neutral",
        value: params.escrow
          ? `Escrow ${params.escrow.state.replaceAll("_", " ")}`
          : params.thread.status === "pending_confirmation"
            ? "Awaiting final confirmation"
            : params.thread.status === "accepted"
              ? "Accepted but not funded"
              : "Negotiation open",
      },
      {
        detail: "Country scope remains relevant for routing payments, checks, and delivery promises.",
        label: "Trade lane",
        tone: "neutral",
        value: params.thread.country_code === "NG" ? "Nigeria" : params.thread.country_code === "GH" ? "Ghana" : params.thread.country_code,
      },
    ],
    summary: params.escrow
      ? "This counterparty has moved into a tracked settlement flow, so trust now depends on delivery proof and wallet state."
      : "This counterparty is still in commercial negotiation, so trust depends on thread clarity and how quickly they keep the deal moving.",
    title: "Counterparty trust snapshot",
  };
}

export function buildEscrowExplainability(
  escrow: EscrowReadModel,
  actorId: string,
): EscrowExplainability {
  const isBuyer = actorId === escrow.buyer_actor_id;

  switch (escrow.state) {
    case "initiated":
      return {
        blocker: "No money is protected yet, so dispatch and release promises should wait.",
        fundsLocation: "No funds are held in escrow yet.",
        nextOwnerLabel: isBuyer ? "Buyer must fund escrow" : "Waiting on buyer funding",
        releaseCondition: "The buyer must move funds into escrow before settlement steps can begin.",
        statusSummary: "This deal is linked to escrow, but the hold has not started.",
      };
    case "pending_funds":
      return {
        blocker: "Payment is still being confirmed by the wallet flow.",
        fundsLocation: "Funds are in transit to the escrow hold.",
        nextOwnerLabel: "Payment confirmation is pending",
        releaseCondition: "The funding request must settle before anyone can release, reverse, or dispute.",
        statusSummary: "Funding is underway but not yet secure enough for release decisions.",
      };
    case "partner_pending":
      return {
        blocker: "The payment partner has not confirmed the hold, so the deal should pause.",
        fundsLocation: "Escrow funding is unresolved with the partner.",
        nextOwnerLabel: isBuyer ? "Buyer should retry or reverse" : "Waiting on buyer action",
        releaseCondition: "Funding must succeed before the seller can rely on this escrow.",
        statusSummary: "The settlement is blocked by a funding issue and needs attention before delivery continues.",
      };
    case "funded":
      return {
        blocker: "Do not release until delivery or inspection proof is complete.",
        fundsLocation: "Funds are held safely in escrow.",
        nextOwnerLabel: isBuyer ? "Buyer tracks proof before release" : "Seller can release after proof",
        releaseCondition: "The seller should release only after the agreed proof or delivery milestone is satisfied.",
        statusSummary: "The money is protected; the remaining risk is operational, not commercial.",
      };
    case "released":
      return {
        blocker: "No active blocker remains; the settlement is complete.",
        fundsLocation: "Funds have been paid out to the seller.",
        nextOwnerLabel: "Completed",
        releaseCondition: "Release already happened and is recorded in the timeline.",
        statusSummary: "This escrow is now a completed payment record.",
      };
    case "reversed":
      return {
        blocker: "The protected deal is no longer active because the funds were returned.",
        fundsLocation: "Funds were returned to the buyer.",
        nextOwnerLabel: "Closed after reversal",
        releaseCondition: "A new negotiation or a new escrow is required before payment can move again.",
        statusSummary: "This settlement path ended with a reversal rather than a payout.",
      };
    case "disputed":
      return {
        blocker: "The funds are frozen until the dispute is resolved.",
        fundsLocation: "Funds are locked inside the disputed escrow.",
        nextOwnerLabel: "Operator review or evidence gathering",
        releaseCondition: "A dispute resolution decision must happen before release or reversal.",
        statusSummary: "This escrow is in an exception state and should be treated as controlled hold money.",
      };
  }
}

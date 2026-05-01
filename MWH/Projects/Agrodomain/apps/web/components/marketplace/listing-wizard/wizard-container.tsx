"use client";

import type { ListingCreateInput } from "@agrodomain/contracts";
import React, { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { StepIndicator } from "@/components/molecules/step-indicator";
import { ListingWizardStepBasic } from "@/components/marketplace/listing-wizard/step-basic";
import { ListingWizardStepMedia } from "@/components/marketplace/listing-wizard/step-media";
import { ListingWizardStepPricing } from "@/components/marketplace/listing-wizard/step-pricing";
import { ListingWizardStepReview } from "@/components/marketplace/listing-wizard/step-review";
import type {
  ListingPhotoDraft,
  ListingWizardDraft,
  ListingWizardFieldErrors,
  ListingWizardStepId,
} from "@/components/marketplace/listing-wizard/types";
import { SurfaceCard, SectionHeading, InsightCallout, StatusPill } from "@/components/ui-primitives";
import { buildListingWizardGuidance } from "@/features/marketplace/trust";
import { auditApi } from "@/lib/api/audit";
import { marketplaceApi } from "@/lib/api/marketplace";
import { DeferredMutationQueuedError } from "@/lib/offline/mutation-engine";
import { recordTelemetry } from "@/lib/telemetry/client";
import { recordMarketplaceConversion } from "@/lib/telemetry/marketplace";

const DRAFT_STORAGE_KEY = "agrodomain_listing_wizard_v1";

const STEPS: Array<{ id: ListingWizardStepId; label: string }> = [
  { id: "basic", label: "Lot details" },
  { id: "pricing", label: "Price and delivery" },
  { id: "media", label: "Photos and proof" },
  { id: "review", label: "Review" },
];

const commodityCategoryMap: Record<string, string> = {
  cassava: "Root crop",
  maize: "Grain",
  rice: "Grain",
  sorghum: "Grain",
  millet: "Grain",
  soybean: "Legume",
  cocoa: "Cash crop",
  plantain: "Fruit crop",
  tomato: "Vegetable",
  pepper: "Vegetable",
};

type SubmissionEvidence = {
  actionLabel: string;
  auditEventCount: number;
  idempotencyKey: string;
  listingId: string;
  replayed: boolean;
  requestId: string;
} | null;

function currencyForCountry(countryCode: string): string {
  switch (countryCode) {
    case "GH":
      return "GHS";
    case "NG":
      return "NGN";
    case "JM":
      return "JMD";
    default:
      return "USD";
  }
}

function defaultDraft(currency: string): ListingWizardDraft {
  return {
    title: "Premium cassava harvest",
    commodity: "Cassava",
    varietyGrade: "Grade A",
    category: "Root crop",
    description: "Bagged cassava stock ready for pickup with moisture proof attached.",
    priceAmount: "320",
    priceCurrency: currency,
    quantityTons: "4.2",
    minimumOrderQuantity: "1.0",
    pricingType: "negotiable",
    availabilityStart: "2026-04-25",
    availabilityEnd: "2026-05-10",
    locationPreset: "Tamale, Northern Region",
    locationManual: "",
    deliveryMode: "both",
    photos: [],
  };
}

function inferCategory(commodity: string): string {
  return commodityCategoryMap[commodity.trim().toLowerCase()] ?? "General produce";
}

function buildLocation(draft: ListingWizardDraft): string {
  return draft.locationManual.trim() || draft.locationPreset.trim();
}

function composeSummary(draft: ListingWizardDraft): string {
  const location = buildLocation(draft);
  return [
    draft.description.trim(),
    `Variety/grade: ${draft.varietyGrade.trim()}.`,
    `Category: ${draft.category.trim()}.`,
    `Pricing: ${draft.pricingType}. MOQ ${draft.minimumOrderQuantity.trim()} tons.`,
    `Availability: ${draft.availabilityStart} to ${draft.availabilityEnd}.`,
    `Delivery: ${draft.deliveryMode}.`,
    `Location: ${location}.`,
  ].join(" ");
}

function toCreateInput(draft: ListingWizardDraft): ListingCreateInput {
  return {
    title: draft.title.trim(),
    commodity: draft.commodity.trim(),
    quantity_tons: Number(draft.quantityTons),
    price_amount: Number(draft.priceAmount),
    price_currency: draft.priceCurrency.trim().toUpperCase(),
    location: buildLocation(draft),
    summary: composeSummary(draft),
  };
}

function validateStep(step: ListingWizardStepId, draft: ListingWizardDraft): ListingWizardFieldErrors {
  const errors: ListingWizardFieldErrors = {};

  if (step === "basic" || step === "review") {
    if (draft.title.trim().length < 3) {
      errors.title = "Use at least 3 characters for the listing title.";
    }
    if (draft.commodity.trim().length < 2) {
      errors.commodity = "Select or enter a commodity.";
    }
    if (draft.varietyGrade.trim().length < 2) {
      errors.varietyGrade = "Add the variety or grade buyers should expect.";
    }
    if (draft.category.trim().length < 2) {
      errors.category = "Choose a category for this lot.";
    }
    if (draft.description.trim().length < 12) {
      errors.description = "Add at least 12 characters of detail.";
    }
  }

  if (step === "pricing" || step === "review") {
    if (!draft.priceAmount.trim() || Number(draft.priceAmount) <= 0) {
      errors.priceAmount = "Price must be greater than zero.";
    }
    if (!/^[A-Z]{3}$/u.test(draft.priceCurrency.trim().toUpperCase())) {
      errors.priceCurrency = "Use a 3-letter currency code.";
    }
    if (!draft.quantityTons.trim() || Number(draft.quantityTons) <= 0) {
      errors.quantityTons = "Quantity must be greater than zero.";
    }
    if (!draft.minimumOrderQuantity.trim() || Number(draft.minimumOrderQuantity) <= 0) {
      errors.minimumOrderQuantity = "Minimum order quantity must be greater than zero.";
    }
    if (
      draft.minimumOrderQuantity.trim() &&
      draft.quantityTons.trim() &&
      Number(draft.minimumOrderQuantity) > Number(draft.quantityTons)
    ) {
      errors.minimumOrderQuantity = "Minimum order quantity cannot exceed total quantity.";
    }
    if (!draft.availabilityStart) {
      errors.availabilityStart = "Set an availability start date.";
    }
    if (!draft.availabilityEnd) {
      errors.availabilityEnd = "Set an availability end date.";
    }
    if (draft.availabilityStart && draft.availabilityEnd && draft.availabilityStart > draft.availabilityEnd) {
      errors.availabilityEnd = "End date must be on or after the start date.";
    }
  }

  if (step === "media" || step === "review") {
    if (draft.photos.length > 5) {
      errors.photos = "You can add up to 5 photos.";
    }
    if (!buildLocation(draft)) {
      errors.location = "Choose a region or enter the pickup location.";
    }
    if (!draft.deliveryMode) {
      errors.deliveryMode = "Choose a delivery option.";
    }
  }

  return errors;
}

async function readFilePreview(file: File): Promise<ListingPhotoDraft> {
  const previewUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("preview_read_failed"));
    reader.readAsDataURL(file);
  });

  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    previewUrl,
    mimeType: file.type,
    rotation: 0,
    size: file.size,
  };
}

async function loadAuditEvidence(requestId: string, idempotencyKey: string, traceId: string): Promise<number> {
  const audit = await auditApi.getEvents(requestId, idempotencyKey, traceId);
  return audit.data.items.length;
}

export function ListingWizardContainer() {
  const { queue, session, traceId } = useAppState();
  const [draft, setDraft] = useState<ListingWizardDraft | null>(null);
  const [currentStep, setCurrentStep] = useState<ListingWizardStepId>("basic");
  const [errors, setErrors] = useState<ListingWizardFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<SubmissionEvidence>(null);
  const [savedListingId, setSavedListingId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    const fallbackDraft = defaultDraft(currencyForCountry(session.actor.country_code));
    const savedDraft = typeof window !== "undefined" ? window.localStorage.getItem(DRAFT_STORAGE_KEY) : null;

    if (!savedDraft) {
      setDraft(fallbackDraft);
      return;
    }

    try {
      const parsed = JSON.parse(savedDraft) as Partial<ListingWizardDraft>;
      setDraft({
        ...fallbackDraft,
        ...parsed,
        photos: Array.isArray(parsed.photos) ? parsed.photos : fallbackDraft.photos,
      });
    } catch {
      setDraft(fallbackDraft);
    }
  }, [session]);

  useEffect(() => {
    if (!draft || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  const guidance = draft ? buildListingWizardGuidance(currentStep, draft) : null;

  useEffect(() => {
    if (!session || !guidance) {
      return;
    }
    recordTelemetry({
      event: "marketplace_conversion_step",
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      detail: {
        actor_role: session.actor.role,
        flow: "listing_wizard",
        readiness_score: guidance.readinessScore,
        step: currentStep,
      },
    });
  }, [currentStep, guidance, session, traceId]);

  if (!session || !draft) {
    return null;
  }

  const activeSession = session;
  const activeDraft = draft;
  const activeGuidance = guidance ?? buildListingWizardGuidance(currentStep, activeDraft);

  function updateDraft<K extends keyof ListingWizardDraft>(field: K, value: ListingWizardDraft[K]) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      if (field === "commodity") {
        const nextCommodity = String(value);
        const currentAutoCategory = inferCategory(current.commodity);
        const nextAutoCategory = inferCategory(nextCommodity);
        return {
          ...current,
          commodity: nextCommodity,
          category:
            current.category.trim().length === 0 || current.category === currentAutoCategory
              ? nextAutoCategory
              : current.category,
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });

    setErrors((current) => {
      const next = { ...current };
      delete next[String(field)];
      return next;
    });
  }

  function moveStep(direction: "next" | "previous") {
    const index = STEPS.findIndex((step) => step.id === currentStep);
    if (direction === "previous") {
      setCurrentStep(STEPS[Math.max(0, index - 1)]?.id ?? "basic");
      return;
    }

    const nextErrors = validateStep(currentStep, activeDraft);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setCurrentStep(STEPS[Math.min(STEPS.length - 1, index + 1)]?.id ?? "review");
  }

  async function addPhotoFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const selectedFiles = Array.from(files).slice(0, 5);
    const previews = await Promise.all(selectedFiles.map((file) => readFilePreview(file)));
    setDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        photos: [...current.photos, ...previews].slice(0, 5),
      };
    });
    setErrors((current) => {
      const next = { ...current };
      delete next.photos;
      return next;
    });
  }

  function removePhoto(photoId: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            photos: current.photos.filter((photo) => photo.id !== photoId),
          }
        : current,
    );
  }

  function rotatePhoto(photoId: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            photos: current.photos.map((photo) =>
              photo.id === photoId
                ? { ...photo, rotation: (photo.rotation + 90) % 360 }
                : photo,
            ),
          }
        : current,
    );
  }

  async function submit(mode: "draft" | "publish") {
    const reviewErrors = validateStep("review", activeDraft);
    if (Object.keys(reviewErrors).length > 0) {
      setErrors(reviewErrors);
      const firstInvalidStep =
        Object.keys(validateStep("basic", activeDraft)).length > 0
          ? "basic"
          : Object.keys(validateStep("pricing", activeDraft)).length > 0
            ? "pricing"
            : "media";
      setCurrentStep(firstInvalidStep);
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionNotice(null);

    try {
      if (mode === "draft" && savedListingId) {
        setSubmissionError("This draft is already saved. Publish it or open the listing detail to continue.");
        return;
      }

      if (mode === "publish" && queue.connectivity_state !== "online") {
        recordMarketplaceConversion({
          actorId: activeSession.actor.actor_id,
          actorRole: activeSession.actor.role,
          blockerCode: "offline_publish_blocked",
          countryCode: activeSession.actor.country_code,
          listingId: savedListingId,
          outcome: "blocked",
          queueDepth: queue.items.length,
          sourceSurface: "listing_wizard",
          stage: "listing_published",
          traceId,
          urgency: "attention",
        });
        setSubmissionError(
          "Publishing requires a live connection. Save the draft offline first, then publish when the connection returns.",
        );
        return;
      }

      let listingId = savedListingId;
      let requestId = "";
      let idempotencyKey = "";
      let replayed = false;
      let actionLabel = "Listing saved as draft";

      if (!listingId) {
        const creation = await marketplaceApi.createListing(
          toCreateInput(activeDraft),
          traceId,
          activeSession.actor.actor_id,
          activeSession.actor.country_code,
        );
        listingId = creation.data.listing.listing_id;
        requestId = creation.data.request_id;
        idempotencyKey = creation.data.idempotency_key;
        replayed = creation.data.replayed;
        setSavedListingId(listingId);
      }

      if (mode === "publish" && listingId) {
        const publish = await marketplaceApi.publishListing(
          { listing_id: listingId },
          traceId,
          activeSession.actor.actor_id,
          activeSession.actor.country_code,
        );
        requestId = publish.data.request_id;
        idempotencyKey = publish.data.idempotency_key;
        replayed = publish.data.replayed;
        actionLabel = "Listing published";
      }

      const auditEventCount = await loadAuditEvidence(requestId, idempotencyKey, traceId);
      recordTelemetry({
        event: "marketplace_conversion_step",
        trace_id: traceId,
        timestamp: new Date().toISOString(),
        detail: {
          action: mode,
          actor_role: activeSession.actor.role,
          audit_event_count: auditEventCount,
          flow: "listing_wizard",
          readiness_score: activeGuidance.readinessScore,
        },
      });
      setEvidence({
        actionLabel,
        auditEventCount,
        idempotencyKey,
        listingId,
        replayed,
        requestId,
      });

      recordMarketplaceConversion({
        actorId: activeSession.actor.actor_id,
        actorRole: activeSession.actor.role,
        countryCode: activeSession.actor.country_code,
        listingId,
        outcome: "completed",
        queueDepth: queue.items.length,
        replayed,
        sourceSurface: "listing_wizard",
        stage: mode === "publish" ? "listing_published" : "listing_draft_saved",
        traceId,
        urgency: mode === "publish" ? "attention" : "routine",
      });

      if (mode === "publish") {
        const resetDraft = defaultDraft(currencyForCountry(activeSession.actor.country_code));
        setDraft(resetDraft);
        setCurrentStep("basic");
        setSavedListingId(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      }
    } catch (error) {
      if (error instanceof DeferredMutationQueuedError) {
        recordMarketplaceConversion({
          actorId: activeSession.actor.actor_id,
          actorRole: activeSession.actor.role,
          countryCode: activeSession.actor.country_code,
          listingId: savedListingId,
          outcome: "completed",
          queueDepth: queue.items.length + 1,
          sourceSurface: "listing_wizard",
          stage: "listing_draft_saved",
          traceId,
          urgency: "attention",
        });
        setSubmissionNotice(
          "Draft saved offline. Open the outbox to replay it when connectivity returns.",
        );
        setEvidence(null);
        return;
      }
      recordMarketplaceConversion({
        actorId: activeSession.actor.actor_id,
        actorRole: activeSession.actor.role,
        blockerCode:
          error instanceof Error ? error.message : "listing_submit_failed",
        countryCode: activeSession.actor.country_code,
        listingId: savedListingId,
        outcome: "blocked",
        queueDepth: queue.items.length,
        sourceSurface: "listing_wizard",
        stage: mode === "publish" ? "listing_published" : "listing_draft_saved",
        traceId,
        urgency: "attention",
      });
      setSubmissionError(error instanceof Error ? error.message : "Unable to save this listing.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Create listing"
          title="Show buyers exactly what you have available"
          body="Move from lot details to pricing, proof, and final review with one guided flow built for customer-facing clarity."
        />
        <StepIndicator currentStep={currentStep} steps={STEPS} className="ds-steps" />
      </SurfaceCard>

      <SurfaceCard>
        <div className="pill-row">
          <StatusPill tone="neutral">{activeSession.actor.role}</StatusPill>
          <StatusPill tone="neutral">Draft saved on this device</StatusPill>
          <StatusPill tone={activeDraft.photos.length > 0 ? "online" : "degraded"}>
            {activeDraft.photos.length > 0 ? `${activeDraft.photos.length} previews ready` : "No photos yet"}
          </StatusPill>
        </div>

        {submissionError ? (
          <p className="field-error" role="alert">
            {submissionError}
          </p>
        ) : null}

        {submissionNotice ? (
          <InsightCallout
            title="Saved offline"
            body={submissionNotice}
            tone="accent"
          />
        ) : null}

        {evidence ? (
          <InsightCallout
            title={`${evidence.actionLabel} confirmed`}
            body={`Listing ${evidence.listingId} was updated successfully. Reference ${evidence.requestId} is available if support needs to review it.`}
            tone="brand"
          />
        ) : null}
      </SurfaceCard>

      <SurfaceCard className="market-guidance-card">
        <SectionHeading
          eyebrow="Guided next step"
          title={activeGuidance.title}
          body={activeGuidance.body}
          actions={
            <div className="pill-row">
              <StatusPill tone={activeGuidance.readinessScore >= 80 ? "online" : activeGuidance.readinessScore >= 55 ? "degraded" : "neutral"}>
                {activeGuidance.readinessLabel}
              </StatusPill>
              <StatusPill tone="neutral">{activeGuidance.nextActionLabel}</StatusPill>
            </div>
          }
        />

        <div className="queue-grid market-guidance-grid">
          <article className="queue-card">
            <h3>What buyers need before they act</h3>
            <div className="market-trust-signal-list" role="list" aria-label="Listing readiness signals">
              {activeGuidance.trustSignals.map((signal) => (
                <article className="market-trust-signal" key={signal.label} role="listitem">
                  <div className="queue-head">
                    <strong>{signal.label}</strong>
                    <StatusPill tone={signal.tone}>{signal.value}</StatusPill>
                  </div>
                  <p className="muted">{signal.detail}</p>
                </article>
              ))}
            </div>
          </article>

          <article className="queue-card">
            <h3>Clear before you continue</h3>
            {activeGuidance.blockers.length === 0 ? (
              <InsightCallout
                title="No current blockers"
                body="This step has enough signal to move forward. Keep the next step focused on clarity, not extra copy."
                tone="brand"
              />
            ) : (
              <ul className="summary-list">
                {activeGuidance.blockers.map((blocker) => (
                  <li key={blocker}>
                    <span>Needs attention</span>
                    <strong>{blocker}</strong>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </SurfaceCard>

      {currentStep === "basic" ? (
        <ListingWizardStepBasic draft={activeDraft} errors={errors} onChange={updateDraft} />
      ) : null}
      {currentStep === "pricing" ? (
        <ListingWizardStepPricing draft={activeDraft} errors={errors} onChange={updateDraft} />
      ) : null}
      {currentStep === "media" ? (
        <ListingWizardStepMedia
          draft={activeDraft}
          errors={errors}
          onChange={updateDraft}
          onPhotoFiles={(files) => void addPhotoFiles(files)}
          onRemovePhoto={removePhoto}
          onRotatePhoto={rotatePhoto}
        />
      ) : null}
      {currentStep === "review" ? (
        <ListingWizardStepReview
          draft={activeDraft}
          isSubmitting={isSubmitting}
          onSubmit={submit}
          savedListingId={savedListingId}
        />
      ) : null}

      <SurfaceCard>
        <div className="actions-row">
          {currentStep !== "basic" ? (
            <button className="button-ghost" type="button" onClick={() => moveStep("previous")}>
              Back
            </button>
          ) : null}
          {currentStep !== "review" ? (
            <button className="button-primary" type="button" onClick={() => moveStep("next")}>
              Continue
            </button>
          ) : null}
        </div>
      </SurfaceCard>
    </div>
  );
}

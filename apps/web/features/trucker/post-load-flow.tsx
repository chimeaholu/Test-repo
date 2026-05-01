"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import { CalendarClock, MapPinned, ReceiptText } from "lucide-react";

import { useAppState } from "@/components/app-provider";
import { SectionHeading, SurfaceCard } from "@/components/ui-primitives";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { truckerApi, defaultPickupWindow } from "@/lib/api/trucker";
import { computeRateEstimate } from "@/features/trucker/model";

type FormState = {
  budget: string;
  commodity: string;
  deliveryDeadline: string;
  destination: string;
  instructions: string;
  itemCount: string;
  pickupDate: string;
  pickupLocation: string;
  pickupWindow: string;
  weightTons: string;
};

function defaultForm(countryCode: string): FormState {
  const pickupDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return {
    budget: countryCode === "NG" ? "220000" : "1500",
    commodity: "White maize",
    deliveryDeadline: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    destination: countryCode === "NG" ? "Lagos" : "Accra",
    instructions: "Keep dry, confirm loading photo, and notify the receiver 60 minutes before arrival.",
    itemCount: "50",
    pickupDate,
    pickupLocation: countryCode === "NG" ? "Kano" : "Tamale",
    pickupWindow: defaultPickupWindow(),
    weightTons: "5",
  };
}

export function PostLoadFlow() {
  const { session, traceId } = useAppState();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>(() => defaultForm(session?.actor.country_code ?? "GH"));
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const estimate = useMemo(
    () =>
      computeRateEstimate({
        countryCode: session?.actor.country_code ?? "GH",
        destination: form.destination,
        pickupLocation: form.pickupLocation,
        weightTons: Number(form.weightTons || 0),
      }),
    [form.destination, form.pickupLocation, form.weightTons, session?.actor.country_code],
  );

  if (!session) {
    return null;
  }

  const activeSession = session;

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!form.pickupLocation.trim()) nextErrors.pickupLocation = "Pickup location is required.";
    if (!form.destination.trim()) nextErrors.destination = "Destination is required.";
    if (!form.commodity.trim()) nextErrors.commodity = "Commodity is required.";
    if (!form.weightTons.trim() || Number(form.weightTons) <= 0) nextErrors.weightTons = "Weight must be greater than zero.";
    if (!form.itemCount.trim() || Number(form.itemCount) <= 0) nextErrors.itemCount = "Item count must be greater than zero.";
    if (!form.pickupDate || form.pickupDate < new Date().toISOString().slice(0, 10)) nextErrors.pickupDate = "Pickup date must be in the future.";
    if (!form.deliveryDeadline || form.deliveryDeadline < form.pickupDate) nextErrors.deliveryDeadline = "Delivery deadline must be on or after pickup date.";
    if (!form.budget.trim() || Number(form.budget) <= 0) nextErrors.budget = "Budget must be greater than zero.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit() {
    if (!validate()) {
      setIsReviewOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await truckerApi.postLoadLive(
        {
          budget: Number(form.budget),
          commodity: form.commodity.trim(),
          deliveryDeadline: form.deliveryDeadline,
          destination: form.destination.trim(),
          instructions: form.instructions.trim(),
          itemCount: Number(form.itemCount),
          pickupDate: form.pickupDate,
          pickupLocation: form.pickupLocation.trim(),
          pickupWindow: form.pickupWindow,
          weightTons: Number(form.weightTons),
        },
        activeSession,
        traceId,
      );
      setSubmissionError(null);
      router.push(`/app/trucker/shipments/${result.loadId}`);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Unable to post load.");
    } finally {
      setIsSubmitting(false);
      setIsReviewOpen(false);
    }
  }

  return (
    <div className="trucker-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Post a transport request"
          title="Describe the load and set the trip clearly"
          body="Add the route, schedule, cargo details, and transport budget so the right carrier can respond."
        />
      </SurfaceCard>

      {submissionError ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {submissionError}
          </p>
        </SurfaceCard>
      ) : null}

      <div className="trucker-form-grid">
        <SurfaceCard>
          <SectionHeading eyebrow="Route" title="Origin and destination" />
          <div className="trucker-field-stack">
            <Field label="Pickup location" error={errors.pickupLocation}>
              <Input
                error={Boolean(errors.pickupLocation)}
                onChange={(event) => update("pickupLocation", event.target.value)}
                placeholder="Tamale, Northern Region"
                value={form.pickupLocation}
              />
            </Field>
            <Field label="Destination" error={errors.destination}>
              <Input
                error={Boolean(errors.destination)}
                onChange={(event) => update("destination", event.target.value)}
                placeholder="Accra, Greater Accra"
                value={form.destination}
              />
            </Field>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading eyebrow="Cargo" title="What is being moved?" />
          <div className="trucker-field-grid">
            <Field label="Commodity" error={errors.commodity}>
              <Input error={Boolean(errors.commodity)} onChange={(event) => update("commodity", event.target.value)} value={form.commodity} />
            </Field>
            <Field label="Weight (tonnes)" error={errors.weightTons}>
              <Input error={Boolean(errors.weightTons)} onChange={(event) => update("weightTons", event.target.value)} value={form.weightTons} />
            </Field>
            <Field label="Number of items" error={errors.itemCount}>
              <Input error={Boolean(errors.itemCount)} onChange={(event) => update("itemCount", event.target.value)} value={form.itemCount} />
            </Field>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading eyebrow="Schedule" title="When should it arrive?" />
          <div className="trucker-field-grid">
            <Field label="Preferred date" error={errors.pickupDate}>
              <Input error={Boolean(errors.pickupDate)} onChange={(event) => update("pickupDate", event.target.value)} type="date" value={form.pickupDate} />
            </Field>
            <Field label="Delivery deadline" error={errors.deliveryDeadline}>
              <Input
                error={Boolean(errors.deliveryDeadline)}
                onChange={(event) => update("deliveryDeadline", event.target.value)}
                type="date"
                value={form.deliveryDeadline}
              />
            </Field>
            <Field label="Preferred time">
              <Select
                onChange={(event) => update("pickupWindow", event.target.value)}
                options={[
                  { label: "Morning (6am-12pm)", value: "Morning (6am-12pm)" },
                  { label: "Afternoon (12pm-6pm)", value: "Afternoon (12pm-6pm)" },
                  { label: "Evening (6pm-10pm)", value: "Evening (6pm-10pm)" },
                  { label: "Any Time", value: "Any Time" },
                ]}
                value={form.pickupWindow}
              />
            </Field>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading eyebrow="Budget" title="Set transport pricing" />
          <div className="trucker-field-stack">
            <Field label="Budget" error={errors.budget}>
              <Input error={Boolean(errors.budget)} onChange={(event) => update("budget", event.target.value)} value={form.budget} />
            </Field>
            <div className="trucker-estimate-banner">
              <ReceiptText size={18} />
              <div>
                <strong>
                  Estimated corridor rate: {estimate.min.toLocaleString()} - {estimate.max.toLocaleString()}{" "}
                  {activeSession.actor.country_code === "NG" ? "NGN" : activeSession.actor.country_code === "JM" ? "JMD" : "GHS"}
                </strong>
                <p className="muted">Use this range to set a practical budget before you review the load.</p>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading eyebrow="Handling notes" title="What the carrier needs to know" />
          <Field label="Special instructions">
            <Textarea onChange={(event) => update("instructions", event.target.value)} value={form.instructions} />
          </Field>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <div className="trucker-review-strip">
          <article>
            <MapPinned size={18} />
            <div>
              <strong>{form.pickupLocation} to {form.destination}</strong>
              <p className="muted">Route corridor</p>
            </div>
          </article>
          <article>
            <CalendarClock size={18} />
            <div>
              <strong>{form.pickupDate}</strong>
              <p className="muted">{form.pickupWindow}</p>
              <p className="muted">Deliver by {form.deliveryDeadline}</p>
            </div>
          </article>
          <article>
            <ReceiptText size={18} />
            <div>
              <strong>{form.budget} {activeSession.actor.country_code === "NG" ? "NGN" : activeSession.actor.country_code === "JM" ? "JMD" : "GHS"}</strong>
              <p className="muted">Transport budget</p>
            </div>
          </article>
          <Button onClick={() => setIsReviewOpen(true)} size="lg">
            Review load
          </Button>
        </div>
      </SurfaceCard>

      <Modal
        footer={
          <div className="trucker-modal-actions">
            <Button onClick={() => setIsReviewOpen(false)} variant="ghost">
              Cancel
            </Button>
            <Button loading={isSubmitting} onClick={() => void submit()}>
              Post load
            </Button>
          </div>
        }
        onClose={() => setIsReviewOpen(false)}
        open={isReviewOpen}
        title="Review load"
      >
        <div className="trucker-review-modal">
          <strong>{form.pickupLocation} to {form.destination}</strong>
          <p className="muted">Confirm the route, cargo, schedule, and budget before you post this load.</p>
          <p className="muted">
            {form.commodity} · {form.weightTons} tonnes · {form.itemCount} items
          </p>
          <p className="muted">
            Pickup {form.pickupDate} during {form.pickupWindow}
          </p>
          <p className="muted">Deliver by {form.deliveryDeadline}</p>
          <p className="muted">
            Budget {form.budget} {activeSession.actor.country_code === "NG" ? "NGN" : activeSession.actor.country_code === "JM" ? "JMD" : "GHS"}
          </p>
          <p className="muted">{form.instructions}</p>
        </div>
      </Modal>
    </div>
  );
}

function Field(props: { children: React.ReactNode; error?: string; label: string }) {
  return (
    <label className="trucker-form-field">
      <span>{props.label}</span>
      {props.children}
      {props.error ? <span className="field-error">{props.error}</span> : null}
    </label>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { HandHelping, LifeBuoy, Users } from "lucide-react";

import { FormField } from "@/components/molecules/form-field";
import { PublicPageShell } from "@/components/public/public-page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { buildFaqJsonLd, buildWebPageJsonLd } from "@/lib/seo";

type FaqSection = {
  title: string;
  items: Array<{ q: string; a: string }>;
};

const faqSections: FaqSection[] = [
  {
    title: "Selling",
    items: [
      {
        q: "How do I start selling?",
        a: "Create your account, complete setup, and open the marketplace to post your first produce listing.",
      },
      {
        q: "Will buyers see my details right away?",
        a: "Agrodomain keeps the conversation focused on the trade so you can review offers before sharing more information.",
      },
    ],
  },
  {
    title: "Buying",
    items: [
      {
        q: "Can I compare more than one supplier?",
        a: "Yes. The marketplace is designed to help buyers compare listings, offers, and follow-up steps from one place.",
      },
    ],
  },
  {
    title: "Payments",
    items: [
      {
        q: "How do I follow payment progress?",
        a: "Payment updates stay tied to the trade flow so you can see what has moved and what still needs confirmation.",
      },
    ],
  },
  {
    title: "Protection",
    items: [
      {
        q: "Where do weather and protection updates appear?",
        a: "Agrodomain keeps weather, planning, and protection context close to the workspace so you can react earlier.",
      },
    ],
  },
  {
    title: "Transport",
    items: [
      {
        q: "Can transport be coordinated from the same platform?",
        a: "Yes. Agrodomain connects trade and movement decisions so delivery planning does not live in a separate tool.",
      },
    ],
  },
] ;

const contactCards = [
  {
    title: "Sales",
    body: "Talk through the role, team shape, and product area that fits your work today.",
    icon: HandHelping,
  },
  {
    title: "Support",
    body: "Get help with sign-in, setup, onboarding, or the next step in your workspace.",
    icon: LifeBuoy,
  },
  {
    title: "Partnerships",
    body: "Discuss rollout, enablement, or how Agrodomain fits into a wider operating model.",
    icon: Users,
  },
] as const;

const flatFaqItems = faqSections.flatMap((section) => section.items);
const contactDescription =
  "Contact Agrodomain for support, sales, and partnership conversations.";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const structuredData = [
    buildWebPageJsonLd("Contact Agrodomain", contactDescription, "/contact", "ContactPage"),
    buildFaqJsonLd(
      flatFaqItems.map((item) => ({
        question: item.q,
        answer: item.a,
      })),
    ),
  ];

  function update(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validateForm(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Please enter your name.";
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (!formData.subject) errors.subject = "Please select a topic.";
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      errors.message = "Please enter a message with a little more detail.";
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setSubmitted(true);
  }

  return (
    <PublicPageShell>
      <main className="pub-route-main" id="main-content">
        <JsonLd data={structuredData} />

        <section className="pub-route-section pub-route-hero">
          <div className="pub-section-shell pub-center-intro">
            <p className="pub-overline">Questions, support, and partnership conversations</p>
            <h1 className="pub-display">Tell us what you need help with.</h1>
            <p className="pub-copy pub-copy-lg">
              Whether you want to use the platform, partner with us, or ask a
              product question, we&apos;ll point you in the right direction.
            </p>
          </div>
        </section>

        <section className="pub-route-section">
          <div className="pub-section-shell">
            <div className="pub-card-grid pub-card-grid-three">
              {contactCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="pub-card pub-card-accent">
                    <span className="pub-icon-badge">
                      <Icon size={20} />
                    </span>
                    <h2>{card.title}</h2>
                    <p>{card.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pub-route-section pub-route-section-soft">
          <div className="pub-section-shell pub-contact-grid">
            <div className="pub-contact-form-wrap">
              <div className="pub-section-intro">
                <p className="pub-overline">Send us a message</p>
                <h2 className="pub-section-title">We&apos;ll use your details only to respond to this request.</h2>
              </div>
              <form className="pub-form-stack" onSubmit={(event) => void handleSubmit(event)} noValidate>
                <FormField label="Name" htmlFor="contact-name" required error={formErrors.name}>
                  <Input
                    id="contact-name"
                    inputSize="lg"
                    value={formData.name}
                    error={Boolean(formErrors.name)}
                    onChange={(event) => update("name", event.target.value)}
                  />
                </FormField>
                <FormField label="Email" htmlFor="contact-email" required error={formErrors.email}>
                  <Input
                    id="contact-email"
                    type="email"
                    inputSize="lg"
                    value={formData.email}
                    error={Boolean(formErrors.email)}
                    onChange={(event) => update("email", event.target.value)}
                  />
                </FormField>
                <FormField label="How can we help?" htmlFor="contact-subject" required error={formErrors.subject}>
                  <Select
                    id="contact-subject"
                    options={[
                      { value: "sales", label: "Sales" },
                      { value: "support", label: "Support" },
                      { value: "partnerships", label: "Partnerships" },
                      { value: "other", label: "Other" },
                    ]}
                    placeholder="Choose a topic"
                    value={formData.subject}
                    error={Boolean(formErrors.subject)}
                    onChange={(event) => update("subject", event.target.value)}
                  />
                </FormField>
                <FormField label="Message" htmlFor="contact-message" required error={formErrors.message}>
                  <Textarea
                    id="contact-message"
                    rows={6}
                    value={formData.message}
                    error={Boolean(formErrors.message)}
                    onChange={(event) => update("message", event.target.value)}
                  />
                </FormField>
                {submitted ? (
                  <p className="pub-form-success" role="status">
                    Thanks. Your message has been captured and the team can follow up from here.
                  </p>
                ) : null}
                <Button variant="primary" type="submit" loading={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send message"}
                </Button>
              </form>
            </div>

            <div className="pub-contact-faq">
              <div className="pub-section-intro">
                <p className="pub-overline">Common questions</p>
                <h2 className="pub-section-title">Quick answers before you reach out.</h2>
              </div>
              <div className="pub-faq-stack">
                {faqSections.map((section) => (
                  <section key={section.title} className="pub-faq-group">
                    <h3>{section.title}</h3>
                    {section.items.map((item) => (
                      <article key={item.q} className="pub-faq-item">
                        <h4>{item.q}</h4>
                        <p>{item.a}</p>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
              <p className="pub-copy pub-copy-sm">
                Need a guided look first? <Link href="/preview" className="pub-inline-text-link">Open the preview page</Link>.
              </p>
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}

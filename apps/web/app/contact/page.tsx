"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { FormField } from "@/components/molecules/form-field";
import { PublicPageShell } from "@/components/public/public-page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { buildFaqJsonLd, buildWebPageJsonLd } from "@/lib/seo";

const faqItems = [
  {
    q: "How do I sign up?",
    a: "Click the 'Start for Free' button on the homepage or visit the sign-up page. You'll complete a quick 3-step registration that takes less than 5 minutes.",
  },
  {
    q: "Is Agrodomain free to use?",
    a: "Yes! Creating an account and using core features is completely free. Premium features like advanced analytics and priority support are available through optional subscription plans.",
  },
  {
    q: "Which countries is Agrodomain available in?",
    a: "Agrodomain currently operates in Ghana, Nigeria, and Jamaica. We're actively expanding to other West African and Caribbean countries.",
  },
  {
    q: "How does crop insurance work?",
    a: "AgroShield uses satellite data to detect weather events like drought or flooding. When a trigger event is confirmed, payouts are automatically deposited into your AgroWallet — no paperwork or inspectors needed.",
  },
  {
    q: "Can I use Agrodomain on a basic phone?",
    a: "Yes. Key features like market prices, weather alerts, and advisory are available via SMS for farmers without smartphones. The web platform is also optimized for low-bandwidth connections.",
  },
  {
    q: "How do I get paid for my crops?",
    a: "When a buyer purchases your listing on AgroMarket, payment is held in escrow via AgroWallet. Once delivery is confirmed, funds are released directly to your mobile money account.",
  },
  {
    q: "Is my data safe?",
    a: "Absolutely. We use industry-standard encryption, role-based access controls, and explicit consent management. You control what data is shared and can revoke consent at any time.",
  },
  {
    q: "Who are the partner organizations?",
    a: "We partner with agricultural ministries, development organizations, microfinance institutions, and insurance providers across our operating countries. Visit the About page for details.",
  },
];

const offices = [
  { flag: "🇬🇭", city: "Accra", country: "Ghana", address: "Innovation Hub, Oxford Street, Osu, Accra" },
  { flag: "🇳🇬", city: "Lagos", country: "Nigeria", address: "Tech Village, Victoria Island, Lagos" },
  { flag: "🇯🇲", city: "Kingston", country: "Jamaica", address: "Digital Hub, New Kingston, Kingston" },
];

const contactDescription =
  "Get in touch with Agrodomain for support, partnerships, onboarding, and platform questions across Ghana, Nigeria, and Jamaica.";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const structuredData = [
    buildWebPageJsonLd("Contact Agrodomain", contactDescription, "/contact", "ContactPage"),
    buildFaqJsonLd(
      faqItems.map((item) => ({
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
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = "Please enter your name.";
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = "Please enter a valid email address.";
    if (!formData.subject) e.subject = "Please select a topic.";
    if (!formData.message.trim() || formData.message.trim().length < 10)
      e.message = "Please enter a message (at least 10 characters).";
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validateForm();
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    // Simulate API call for contact form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setSubmitted(true);
  }

  return (
    <PublicPageShell>
      <main className="page-shell" id="main-content">
      <JsonLd data={structuredData} />
      {/* Hero */}
      <section
        style={{
          background: "var(--color-brand-900, #1a2f1e)",
          padding: "64px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h1
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 700,
              fontSize: "clamp(2.25rem, 5vw, 3rem)",
              lineHeight: 1.15,
              color: "#fff",
              marginBottom: 16,
            }}
          >
            Get in Touch
          </h1>
          <p
            style={{
              fontSize: "1.125rem",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.80)",
              maxWidth: 560,
              margin: "0 auto",
            }}
          >
            Whether you have a question, feedback, or need help getting started — we&apos;re here for you.
          </p>
        </div>
      </section>

      {/* Support Channels */}
      <section style={{ background: "#fff", padding: "64px 24px" }}>
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 24,
          }}
        >
          {/* WhatsApp */}
          <article
            style={{
              background: "var(--color-neutral-50, #f8f3ea)",
              borderRadius: 16,
              padding: "32px 28px",
              border: "1px solid var(--color-neutral-200, #e2e0dc)",
              textAlign: "center",
              transition: "all 200ms ease",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(37,211,102,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: 24,
              }}
            >
              💬
            </div>
            <h3
              style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 600,
                fontSize: "1.25rem",
                color: "var(--ink)",
                marginBottom: 8,
              }}
            >
              WhatsApp
            </h3>
            <p
              style={{
                fontSize: "0.9375rem",
                lineHeight: 1.5,
                color: "var(--ink-muted)",
                marginBottom: 16,
              }}
            >
              Chat with our support team instantly. Available Monday to Saturday, 7 AM – 8 PM GMT.
            </p>
            <span
              style={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "var(--color-accent-700, #c17b2a)",
              }}
            >
              Start Chat →
            </span>
          </article>

          {/* Email */}
          <article
            style={{
              background: "var(--color-neutral-50, #f8f3ea)",
              borderRadius: 16,
              padding: "32px 28px",
              border: "1px solid var(--color-neutral-200, #e2e0dc)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(59,130,196,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: 24,
              }}
            >
              📧
            </div>
            <h3
              style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 600,
                fontSize: "1.25rem",
                color: "var(--ink)",
                marginBottom: 8,
              }}
            >
              Email
            </h3>
            <p
              style={{
                fontSize: "0.9375rem",
                lineHeight: 1.5,
                color: "var(--ink-muted)",
                marginBottom: 16,
              }}
            >
              Send us a detailed message. We respond within 24 hours on business days.
            </p>
            <a
              href="mailto:support@agrodomain.com"
              style={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "var(--color-accent-700, #c17b2a)",
                textDecoration: "none",
              }}
            >
              support@agrodomain.com →
            </a>
          </article>

          {/* Phone */}
          <article
            style={{
              background: "var(--color-neutral-50, #f8f3ea)",
              borderRadius: 16,
              padding: "32px 28px",
              border: "1px solid var(--color-neutral-200, #e2e0dc)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(74,140,94,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: 24,
              }}
            >
              📞
            </div>
            <h3
              style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 600,
                fontSize: "1.25rem",
                color: "var(--ink)",
                marginBottom: 8,
              }}
            >
              Phone
            </h3>
            <p
              style={{
                fontSize: "0.9375rem",
                lineHeight: 1.5,
                color: "var(--ink-muted)",
                marginBottom: 16,
              }}
            >
              Call us directly. Available Monday to Friday, 8 AM – 5 PM GMT.
            </p>
            <span
              style={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "var(--color-accent-700, #c17b2a)",
              }}
            >
              +233 30 XXX XXXX →
            </span>
          </article>
        </div>
      </section>

      {/* Contact Form + FAQ */}
      <section style={{ background: "var(--color-neutral-50, #f8f3ea)", padding: "80px 24px" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 48,
          }}
        >
          {/* Contact Form */}
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "40px 36px",
              border: "1px solid var(--color-neutral-200, #e2e0dc)",
              boxShadow: "0 2px 12px rgba(26,47,30,0.04)",
            }}
          >
            {submitted ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h3
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: 600,
                    fontSize: "1.375rem",
                    color: "var(--ink)",
                    marginBottom: 8,
                  }}
                >
                  Message Sent
                </h3>
                <p style={{ color: "var(--ink-muted)", marginBottom: 24 }}>
                  Thank you for reaching out. We&apos;ll get back to you within 24 hours.
                </p>
                <Button variant="ghost" onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", phone: "", subject: "", message: "" }); }}>
                  Send Another Message
                </Button>
              </div>
            ) : (
              <>
                <h3
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: 600,
                    fontSize: "1.5rem",
                    color: "var(--ink)",
                    marginBottom: 8,
                  }}
                >
                  Send Us a Message
                </h3>
                <p
                  style={{
                    fontSize: "0.9375rem",
                    color: "var(--ink-muted)",
                    marginBottom: 28,
                  }}
                >
                  Fill out the form below and we&apos;ll get back to you as soon as possible.
                </p>

                <form onSubmit={(e) => void handleSubmit(e)} noValidate>
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <FormField label="Your name" htmlFor="contact-name" required error={formErrors.name}>
                      <Input
                        id="contact-name"
                        inputSize="lg"
                        placeholder="e.g. Ama Mensah"
                        autoComplete="name"
                        value={formData.name}
                        error={Boolean(formErrors.name)}
                        onChange={(e) => update("name", e.target.value)}
                      />
                    </FormField>

                    <FormField label="Email address" htmlFor="contact-email" required error={formErrors.email}>
                      <Input
                        id="contact-email"
                        type="email"
                        inputSize="lg"
                        placeholder="e.g. ama@email.com"
                        autoComplete="email"
                        value={formData.email}
                        error={Boolean(formErrors.email)}
                        onChange={(e) => update("email", e.target.value)}
                      />
                    </FormField>

                    <FormField label="Phone number (optional)" htmlFor="contact-phone">
                      <Input
                        id="contact-phone"
                        type="tel"
                        inputSize="lg"
                        placeholder="e.g. +233 024 123 4567"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={(e) => update("phone", e.target.value)}
                      />
                    </FormField>

                    <FormField label="Subject" htmlFor="contact-subject" required error={formErrors.subject}>
                      <Select
                        id="contact-subject"
                        options={[
                          { value: "general", label: "General Inquiry" },
                          { value: "support", label: "Technical Support" },
                          { value: "partnership", label: "Partnership Opportunity" },
                          { value: "feedback", label: "Feedback" },
                          { value: "media", label: "Media / Press" },
                          { value: "careers", label: "Careers" },
                          { value: "other", label: "Other" },
                        ]}
                        placeholder="Select topic"
                        value={formData.subject}
                        error={Boolean(formErrors.subject)}
                        onChange={(e) => update("subject", e.target.value)}
                      />
                    </FormField>

                    <FormField label="Message" htmlFor="contact-message" required error={formErrors.message}>
                      <Textarea
                        id="contact-message"
                        placeholder="Tell us how we can help..."
                        rows={5}
                        value={formData.message}
                        error={Boolean(formErrors.message)}
                        onChange={(e) => update("message", e.target.value)}
                      />
                    </FormField>

                    <Button
                      variant="primary"
                      type="submit"
                      loading={isSubmitting}
                      size="lg"
                    >
                      {isSubmitting ? "Sending\u2026" : "Send Message"}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* FAQ */}
          <div>
            <h3
              style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 600,
                fontSize: "1.5rem",
                color: "var(--ink)",
                marginBottom: 24,
              }}
            >
              Frequently Asked Questions
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {faqItems.map((item, i) => (
                <details
                  key={i}
                  open={openFaq === i}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px solid var(--color-neutral-200, #e2e0dc)",
                    overflow: "hidden",
                  }}
                >
                  <summary
                    onClick={(e) => {
                      e.preventDefault();
                      setOpenFaq(openFaq === i ? null : i);
                    }}
                    style={{
                      padding: "16px 20px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.9375rem",
                      color: "var(--ink)",
                      listStyle: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    {item.q}
                    <span
                      style={{
                        flexShrink: 0,
                        transition: "transform 200ms ease",
                        transform: openFaq === i ? "rotate(90deg)" : "rotate(0deg)",
                        color: "var(--ink-muted)",
                      }}
                    >
                      ▸
                    </span>
                  </summary>
                  {openFaq === i && (
                    <div
                      style={{
                        padding: "0 20px 16px",
                        fontSize: "0.9375rem",
                        lineHeight: 1.6,
                        color: "var(--ink-muted)",
                      }}
                    >
                      {item.a}
                    </div>
                  )}
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Office Locations */}
      <section style={{ background: "#fff", padding: "64px 24px" }}>
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 24,
          }}
        >
          {offices.map((office) => (
            <article
              key={office.city}
              style={{
                background: "var(--color-neutral-50, #f8f3ea)",
                borderRadius: 16,
                padding: "32px 28px",
                border: "1px solid var(--color-neutral-200, #e2e0dc)",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 32, display: "block", marginBottom: 12 }}>
                {office.flag}
              </span>
              <h4
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontWeight: 600,
                  fontSize: "1.125rem",
                  color: "var(--ink)",
                  marginBottom: 8,
                }}
              >
                {office.city}, {office.country}
              </h4>
              <p style={{ fontSize: "0.875rem", color: "var(--ink-muted)", lineHeight: 1.5 }}>
                {office.address}
              </p>
            </article>
          ))}
        </div>
      </section>
      </main>
    </PublicPageShell>
  );
}

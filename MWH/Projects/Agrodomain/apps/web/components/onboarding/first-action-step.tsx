"use client";

import type { IdentitySession, ActorRole } from "@agrodomain/contracts";
import { Button } from "@/components/ui";

interface FirstActionStepProps {
  session: IdentitySession;
  onComplete: () => void;
  onTour: () => void;
}

interface ActionCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

const actionsByRole: Record<string, ActionCard[]> = {
  farmer: [
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 6h16v16H6z" />
          <path d="M6 10h16M10 6v16" />
        </svg>
      ),
      title: "List your first crop for sale",
      description: "Start selling on AgroMarket",
      href: "/app/market/listings",
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 4C8.5 4 6 8 6 14s2.5 10 8 10 8-4 8-10S19.5 4 14 4z" />
          <path d="M14 8v6l4 2" />
        </svg>
      ),
      title: "Check your local weather",
      description: "See this week\u2019s forecast",
      href: "/app/weather",
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="14" cy="14" r="10" />
          <path d="M14 8v4l3 3" />
          <path d="M10 18h8" />
        </svg>
      ),
      title: "Apply for micro-funding",
      description: "Explore AgroFund options",
      href: "/app/farmer",
    },
  ],
  buyer: [
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="14" cy="12" r="8" />
          <path d="M18 18l4 4" />
        </svg>
      ),
      title: "Browse available crops",
      description: "Find verified produce near you",
      href: "/app/market/listings",
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="6" />
          <path d="M17 11h6M20 8v6" />
        </svg>
      ),
      title: "Connect with farmers",
      description: "Build your supplier network",
      href: "/app/market/negotiations",
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 8A6 6 0 0 0 8 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M15.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
      title: "Set up price alerts",
      description: "Get notified when prices drop",
      href: "/app/weather",
    },
  ],
};

function getActionsForRole(role: ActorRole): ActionCard[] {
  return actionsByRole[role] ?? actionsByRole.farmer;
}

export function FirstActionStep({ session, onComplete, onTour }: FirstActionStepProps) {
  const actions = getActionsForRole(session.actor.role);

  return (
    <div className="onboarding-step onboarding-step-final">
      <h2 className="onboarding-final-heading">Choose your first action</h2>
      <p className="onboarding-final-subheading">
        Choose the first thing you want to do so the workspace opens in the right place.
      </p>

      <div className="onboarding-action-cards">
        {actions.map((action) => (
          <a
            key={action.title}
            href={action.href}
            className="onboarding-action-card"
          >
            <div className="onboarding-action-icon" aria-hidden="true">
              {action.icon}
            </div>
            <div className="onboarding-action-text">
              <p className="onboarding-action-title">{action.title}</p>
              <p className="onboarding-action-desc">{action.description}</p>
            </div>
            <svg className="onboarding-action-arrow" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        ))}
      </div>

      <Button
        variant="secondary"
        size="lg"
        className="onboarding-dashboard-btn"
        onClick={onComplete}
      >
        Open my workspace
      </Button>

      <p className="onboarding-tour-link">
        or{" "}
        <button type="button" className="onboarding-tour-link-btn" onClick={onTour}>
          take a quick tour
        </button>
      </p>
    </div>
  );
}

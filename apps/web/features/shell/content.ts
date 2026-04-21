import type { ActorRole } from "@agrodomain/contracts";

export interface RoleTask {
  label: string;
  detail: string;
  href: string;
  tone: "primary" | "secondary" | "warning";
}

export interface RoleExperience {
  eyebrow: string;
  headline: string;
  summary: string;
  dominantActionLabel: string;
  dominantActionHref: string;
  queueTitle: string;
  proofTitle: string;
  fieldMode: string;
  deskMode: string;
  trustNote: string;
  tasks: RoleTask[];
}

export const ROLE_EXPERIENCE: Record<ActorRole, RoleExperience> = {
  farmer: {
    eyebrow: "Field flow",
    headline: "Finish setup, publish produce, and keep every field action recoverable.",
    summary:
      "The farmer home prioritizes one clear next step, short copy, and visible queue recovery so low-bandwidth work still feels safe.",
    dominantActionLabel: "List produce",
    dominantActionHref: "/app/market/listings",
    queueTitle: "Field actions",
    proofTitle: "Why this is safe",
    fieldMode: "Thumb-first mobile flow with one dominant action and offline recovery.",
    deskMode: "Tablet view keeps evidence and queue state adjacent during assisted onboarding.",
    trustNote: "Consent, queue freshness, and evidence ownership stay visible before any protected action.",
    tasks: [
      {
        label: "Check consent",
        detail: "Confirm regulated actions are unlocked before you leave network coverage.",
        href: "/app/profile",
        tone: "secondary",
      },
      {
        label: "Open outbox",
        detail: "Review queued listing drafts and replay conflicts in order.",
        href: "/app/offline/outbox",
        tone: "warning",
      },
    ],
  },
  buyer: {
    eyebrow: "Buyer flow",
    headline: "Review supply quickly, inspect proof, and move offers without losing context.",
    summary:
      "The buyer home exposes trusted listing work first, then keeps proof and negotiation recovery within one tap.",
    dominantActionLabel: "Review market",
    dominantActionHref: "/app/market/listings",
    queueTitle: "Offer work",
    proofTitle: "Proof before commitment",
    fieldMode: "Mobile browsing keeps actions short and evidence compact.",
    deskMode: "Larger screens keep market details and trust signals side by side.",
    trustNote: "Listing proof, identity state, and queue continuity appear before deal actions.",
    tasks: [
      {
        label: "Review offers",
        detail: "Jump back into active negotiations with queue counts already surfaced.",
        href: "/app/market/negotiations",
        tone: "primary",
      },
      {
        label: "Check alerts",
        detail: "Climate or quality shifts can change buying posture before confirmation.",
        href: "/app/climate/alerts",
        tone: "secondary",
      },
    ],
  },
  cooperative: {
    eyebrow: "Ops flow",
    headline: "Coordinate member work, verify field updates, and keep dispatch decisions visible.",
    summary:
      "The cooperative surface favors queue clarity and cross-checking evidence over decorative dashboard density.",
    dominantActionLabel: "Open dispatch",
    dominantActionHref: "/app/cooperative/dispatch",
    queueTitle: "Operations queue",
    proofTitle: "Operational proof",
    fieldMode: "Tablet-friendly cards preserve readability in shared-device environments.",
    deskMode: "Desktop rail supports higher-throughput queue triage and evidence review.",
    trustNote: "Dispatch state, member actions, and queue conflicts are framed as operational tasks, not buried system alerts.",
    tasks: [
      {
        label: "Member queue",
        detail: "Track member actions that need verification before dispatch or payout.",
        href: "/app/cooperative/dispatch",
        tone: "primary",
      },
      {
        label: "Resolve conflicts",
        detail: "Replay or escalate outbox issues before they block downstream flows.",
        href: "/app/offline/outbox",
        tone: "warning",
      },
    ],
  },
  advisor: {
    eyebrow: "Advisory flow",
    headline: "Respond with evidence, keep language plain, and show what the advice is based on.",
    summary:
      "The advisor home emphasizes proof-bearing recommendations, consent visibility, and fast triage for field support.",
    dominantActionLabel: "Open requests",
    dominantActionHref: "/app/advisor/requests",
    queueTitle: "Case queue",
    proofTitle: "Evidence posture",
    fieldMode: "Mobile and tablet views keep one clear case action in reach while preserving proof context.",
    deskMode: "Desktop views favor queue-to-detail comparison for faster advisory throughput.",
    trustNote: "Advice never appears without provenance, role context, and a safe next step.",
    tasks: [
      {
        label: "Case queue",
        detail: "Continue advisory requests with role, locale, and queue state already loaded.",
        href: "/app/advisor/requests",
        tone: "primary",
      },
      {
        label: "Climate triage",
        detail: "Pair recommendations with alert severity and freshness before escalation.",
        href: "/app/climate/alerts",
        tone: "secondary",
      },
    ],
  },
  finance: {
    eyebrow: "Risk flow",
    headline: "Review partner-owned decisions with clear policy checks and auditable context.",
    summary:
      "The finance surface keeps review responsibility explicit so approval work never feels like a black box.",
    dominantActionLabel: "Open queue",
    dominantActionHref: "/app/finance/queue",
    queueTitle: "Decision queue",
    proofTitle: "Responsibility boundary",
    fieldMode: "Compact layouts retain decision state but defer dense evidence stacks until needed.",
    deskMode: "Desktop layouts prioritize throughput, evidence adjacency, and audit context.",
    trustNote: "Partner boundaries, consent state, and review codes remain visible before a regulated action proceeds.",
    tasks: [
      {
        label: "Review queue",
        detail: "Inspect the protected review queue with role-aware routing already enforced.",
        href: "/app/finance/queue",
        tone: "primary",
      },
      {
        label: "Consent check",
        detail: "Reconfirm revocation and recovery posture before protected mutations.",
        href: "/app/profile",
        tone: "warning",
      },
    ],
  },
  admin: {
    eyebrow: "Control flow",
    headline: "See platform health quickly, then move into analytics once active risks are framed.",
    summary:
      "The admin surface starts with platform health and launch posture rather than defaulting to chart-heavy clutter.",
    dominantActionLabel: "Open analytics",
    dominantActionHref: "/app/admin/analytics",
    queueTitle: "Control checks",
    proofTitle: "Readiness proof",
    fieldMode: "Mobile access trims to core state so admins can validate health from anywhere.",
    deskMode: "Larger screens can hold telemetry, route posture, and readiness context together.",
    trustNote: "State naming, queue risk, and route readiness remain explicit to support release gates.",
    tasks: [
      {
        label: "Platform health",
        detail: "Review shell, onboarding, and queue signals before deeper feature rollout.",
        href: "/app/admin/analytics",
        tone: "primary",
      },
      {
        label: "Outbox risk",
        detail: "Audit replay conflicts and handoff advice before support load increases.",
        href: "/app/offline/outbox",
        tone: "secondary",
      },
    ],
  },
};

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
  confidenceNote: string;
  nextStepNote: string;
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
    queueTitle: "Field work",
    proofTitle: "Why you can move with confidence",
    confidenceNote: "Your listing progress, permissions, and recent activity stay visible before you publish or update produce.",
    nextStepNote: "Finish setup or return to saved listing work.",
    fieldMode: "A mobile-first flow keeps the main farming action within reach and saves your progress if coverage drops.",
    deskMode: "Desktop and tablet layouts keep your listing details and recent activity side by side.",
    trustNote: "Your permissions, saved progress, and ownership details stay clear before you make a change.",
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
    headline: "Browse trusted supply, compare quality, and move offers forward with confidence.",
    summary:
      "The buyer home puts live supply, deal progress, and follow-up actions in one place so it stays easy to compare lots and act quickly.",
    dominantActionLabel: "Review market",
    dominantActionHref: "/app/market/listings",
    queueTitle: "Active offers",
    proofTitle: "What supports this listing",
    confidenceNote: "Key listing details, seller information, and your recent deal activity stay visible before you make or confirm an offer.",
    nextStepNote: "Review listings or return to an active negotiation.",
    fieldMode: "Mobile browsing keeps search, comparison, and offer actions quick and easy to scan.",
    deskMode: "Larger screens keep listings, deal context, and next actions visible together.",
    trustNote: "The details that matter before you commit stay visible before any offer action.",
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
        href: "/app/weather",
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
    proofTitle: "Why this work is ready",
    confidenceNote: "Member activity, dispatch readiness, and saved work stay clear before you approve the next move.",
    nextStepNote: "Open dispatch or resolve the items waiting for review.",
    fieldMode: "Tablet-friendly cards keep member work readable on shared devices in the field.",
    deskMode: "Desktop layouts support faster queue review and dispatch coordination.",
    trustNote: "Dispatch state, member activity, and saved work are framed as clear operational tasks.",
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
  transporter: {
    eyebrow: "Delivery flow",
    headline: "Track load readiness, protect handoffs, and keep deliveries moving with clear status.",
    summary:
      "The transporter workspace emphasizes available work, current deliveries, and proof-bearing updates instead of generic admin filler.",
    dominantActionLabel: "Open loads",
    dominantActionHref: "/app/cooperative/dispatch",
    queueTitle: "Dispatch queue",
    proofTitle: "Delivery confidence",
    confidenceNote: "Load status, counterpart details, and recovery posture stay visible before you accept or update a job.",
    nextStepNote: "Review available loads or continue an active delivery.",
    fieldMode: "Mobile layouts keep route details and next actions visible when drivers are on the move.",
    deskMode: "Desktop space helps compare available work, earnings, and live delivery state.",
    trustNote: "Only the details needed to accept, move, or close a delivery stay in view.",
    tasks: [
      {
        label: "Available loads",
        detail: "Review the next loads waiting for assignment or dispatch.",
        href: "/app/cooperative/dispatch",
        tone: "primary",
      },
      {
        label: "Wallet status",
        detail: "Keep payout and settlement state visible while deliveries are active.",
        href: "/app/payments/wallet",
        tone: "secondary",
      },
    ],
  },
  investor: {
    eyebrow: "Portfolio flow",
    headline: "Review live opportunities, monitor portfolio health, and keep payout signals visible.",
    summary:
      "The investor workspace combines available opportunities, capital exposure, and return posture into one investment-focused surface.",
    dominantActionLabel: "Explore opportunities",
    dominantActionHref: "/app/market/listings",
    queueTitle: "Portfolio activity",
    proofTitle: "Return signals",
    confidenceNote: "Funding posture, portfolio totals, and farm update signals remain visible before you commit more capital.",
    nextStepNote: "Review the next featured opportunity or monitor an active investment.",
    fieldMode: "Mobile views keep the most relevant portfolio and opportunity signals clear without chart clutter.",
    deskMode: "Desktop layouts give enough room to compare opportunities, returns, and risk posture together.",
    trustNote: "Return expectations and live operating signals stay visible before you fund a new opportunity.",
    tasks: [
      {
        label: "Browse opportunities",
        detail: "Review market supply that can translate into investment demand.",
        href: "/app/market/listings",
        tone: "primary",
      },
      {
        label: "Review wallet",
        detail: "Track exposure, balances, and release events from one place.",
        href: "/app/payments/wallet",
        tone: "secondary",
      },
    ],
  },
  extension_agent: {
    eyebrow: "Field support",
    headline: "Keep advisory requests grounded, regional context visible, and response follow-through clear.",
    summary:
      "The extension agent workspace focuses on actionable farmer support, source-backed guidance, and climate context.",
    dominantActionLabel: "Open request queue",
    dominantActionHref: "/app/advisor/requests",
    queueTitle: "Field requests",
    proofTitle: "Grounding context",
    confidenceNote: "Advice, cited evidence, and climate posture stay visible before an extension response is shared.",
    nextStepNote: "Pick up the next request or review regional alerts.",
    fieldMode: "Compact views keep case details and route-to-action steps accessible during field visits.",
    deskMode: "Larger layouts support request triage and cross-checking sources before delivery.",
    trustNote: "Advice is framed around source-backed recommendations and current field context.",
    tasks: [
      {
        label: "Open requests",
        detail: "Continue the latest advisory or farmer-support cases.",
        href: "/app/advisor/requests",
        tone: "primary",
      },
      {
        label: "Climate posture",
        detail: "Check weather and degraded-data conditions before issuing guidance.",
        href: "/app/weather",
        tone: "secondary",
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
    queueTitle: "Open requests",
    proofTitle: "What this advice is based on",
    confidenceNote: "Source context, recent case activity, and review status stay visible before advice is shared or updated.",
    nextStepNote: "Resume an open request or review the next urgent case.",
    fieldMode: "Mobile and tablet views keep the next advisory action in reach while preserving source context.",
    deskMode: "Desktop views make it easier to compare case details, source evidence, and next actions.",
    trustNote: "Advice is shown with the context needed to review it responsibly.",
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
        href: "/app/weather",
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
    queueTitle: "Review queue",
    proofTitle: "Decision context",
    confidenceNote: "Decision status, supporting details, and recent activity stay visible so finance teams can review with confidence.",
    nextStepNote: "Open the review queue and resolve the next decision in line.",
    fieldMode: "Compact layouts keep the most important approval details visible without overloading the screen.",
    deskMode: "Desktop layouts prioritize throughput, supporting context, and clear decision review.",
    trustNote: "Decision boundaries and review context stay explicit before a regulated action moves forward.",
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
    queueTitle: "Platform checks",
    proofTitle: "Readiness signals",
    confidenceNote: "Platform health, recent issues, and review-ready states stay visible before you open deeper analytics.",
    nextStepNote: "Review platform health, then move into analytics.",
    fieldMode: "Mobile access trims the experience to the most important health checks.",
    deskMode: "Larger screens can hold telemetry, alerts, and platform readiness together.",
    trustNote: "Platform health and launch readiness stay explicit to support fast operational review.",
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

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
    eyebrow: "Farmer workspace",
    headline: "Keep today's farm and market decisions clear.",
    summary:
      "Check what needs attention, move produce into the market, and keep weather and payment updates close by.",
    dominantActionLabel: "Create listing",
    dominantActionHref: "/app/market/listings",
    queueTitle: "Saved work",
    proofTitle: "Weather and guidance",
    confidenceNote: "Keep one practical recommendation close to the work you are doing now.",
    nextStepNote: "Anything you started earlier stays easy to find.",
    fieldMode: "Mobile layouts keep market, weather, and payment decisions easy to scan in the field.",
    deskMode: "Larger screens keep recent activity, produce details, and guidance visible together.",
    trustNote: "Your next farm, market, and payment decision stays visible without extra system language.",
    tasks: [
      {
        label: "Review offers",
        detail: "See who responded and keep live buyer conversations moving.",
        href: "/app/market/negotiations",
        tone: "secondary",
      },
      {
        label: "Ask AgroGuide",
        detail: "Keep one practical recommendation close to today's field work.",
        href: "/app/advisory/new",
        tone: "warning",
      },
    ],
  },
  buyer: {
    eyebrow: "Buyer workspace",
    headline: "Compare supply, move offers, and keep purchase decisions moving.",
    summary:
      "See available lots, track active deals, and keep payment readiness visible from one place.",
    dominantActionLabel: "Browse market",
    dominantActionHref: "/app/market/listings",
    queueTitle: "Deals in motion",
    proofTitle: "Fresh supply to review",
    confidenceNote: "Product, origin, and quality cues stay visible before you make the next offer.",
    nextStepNote: "Return to an active offer or open the next lot to review.",
    fieldMode: "Mobile browsing keeps search, comparison, and offer actions quick and easy to scan.",
    deskMode: "Larger screens keep listings, deal context, and next actions visible together.",
    trustNote: "The supply, deal, and payment signals that matter stay visible before you commit.",
    tasks: [
      {
        label: "Open offers",
        detail: "Jump back into the offers that still need your answer.",
        href: "/app/market/negotiations",
        tone: "primary",
      },
      {
        label: "Payment ready",
        detail: "Keep wallet and payout readiness visible before you confirm the next purchase.",
        href: "/app/payments/wallet",
        tone: "secondary",
      },
    ],
  },
  cooperative: {
    eyebrow: "Cooperative workspace",
    headline: "Coordinate members, shipments, and payouts with less back-and-forth.",
    summary:
      "Keep your member activity, dispatch readiness, and payment follow-up visible in one operating view.",
    dominantActionLabel: "Open dispatch",
    dominantActionHref: "/app/cooperative/dispatch",
    queueTitle: "What needs movement today",
    proofTitle: "Transport and payout follow-up",
    confidenceNote: "Member and market activity stay visible before you move the next shipment or payout.",
    nextStepNote: "Open dispatch or review the member work that needs attention first.",
    fieldMode: "Tablet-friendly cards keep member work readable on shared devices in the field.",
    deskMode: "Desktop layouts support faster coordination across member, transport, and payout work.",
    trustNote: "Member, market, transport, and payout work stays grouped around clear next steps.",
    tasks: [
      {
        label: "Review members",
        detail: "See which member actions need attention before dispatch or payout moves forward.",
        href: "/app/cooperative/dispatch",
        tone: "primary",
      },
      {
        label: "Watch payouts",
        detail: "Keep money-on-the-way and held funds visible while trade work moves.",
        href: "/app/payments/wallet",
        tone: "secondary",
      },
    ],
  },
  transporter: {
    eyebrow: "Transport workspace",
    headline: "See active deliveries, open loads, and payout progress in one place.",
    summary:
      "Use this workspace to keep trips moving, update milestones, and stay ready for the next load.",
    dominantActionLabel: "View open loads",
    dominantActionHref: "/app/cooperative/dispatch",
    queueTitle: "What is moving now",
    proofTitle: "What needs an update",
    confidenceNote: "The load, driver, and payout details needed for the next handoff stay easy to find.",
    nextStepNote: "Open the next load or continue the delivery already in progress.",
    fieldMode: "Mobile layouts keep route details and next actions visible when drivers are on the move.",
    deskMode: "Desktop space helps compare available work, earnings, and live delivery state.",
    trustNote: "Trip, load, and payout updates stay visible without exposing control-plane language.",
    tasks: [
      {
        label: "Track delivery",
        detail: "Open the latest active shipment and update the next milestone.",
        href: "/app/trucker",
        tone: "primary",
      },
      {
        label: "View earnings",
        detail: "Keep payout progress visible while deliveries are active.",
        href: "/app/payments/wallet",
        tone: "secondary",
      },
    ],
  },
  investor: {
    eyebrow: "Investor workspace",
    headline: "Track your portfolio and review the next farm opportunity.",
    summary:
      "See current commitments, expected returns, and payout progress without digging through separate screens.",
    dominantActionLabel: "Explore opportunities",
    dominantActionHref: "/app/fund",
    queueTitle: "Where to invest next",
    proofTitle: "Recent payouts and movement",
    confidenceNote: "Current commitments and payout progress stay visible beside the next opportunity to review.",
    nextStepNote: "Open the next opportunity or return to the portfolio you already manage.",
    fieldMode: "Mobile views keep the most relevant opportunity and payout signals in easy reach.",
    deskMode: "Larger screens give room to compare opportunities, returns, and portfolio protection.",
    trustNote: "Portfolio, opportunity, and return signals stay visible without dense internal labels.",
    tasks: [
      {
        label: "View portfolio",
        detail: "Review active commitments, returns, and payout progress from one place.",
        href: "/app/fund/my-investments",
        tone: "primary",
      },
      {
        label: "Watch returns",
        detail: "Keep payout movement and capital exposure visible while you review the next farm.",
        href: "/app/payments/wallet",
        tone: "secondary",
      },
    ],
  },
  extension_agent: {
    eyebrow: "Field support workspace",
    headline: "Respond to farmer needs with clearer local context.",
    summary:
      "See who needs help, what is changing in the field, and what guidance is most useful right now.",
    dominantActionLabel: "Open requests",
    dominantActionHref: "/app/advisor/requests",
    queueTitle: "Who needs support now",
    proofTitle: "Recent follow-through",
    confidenceNote: "Requests, local weather pressure, and recent guidance stay visible together while you respond.",
    nextStepNote: "Pick up the next request or review the local alerts shaping field work today.",
    fieldMode: "Compact views keep the next field-support action within reach during visits.",
    deskMode: "Larger layouts support request review and regional follow-up planning.",
    trustNote: "Farmer support stays grounded in local conditions and recent guidance, not reviewer jargon.",
    tasks: [
      {
        label: "Open requests",
        detail: "Continue the field-support requests waiting on your response.",
        href: "/app/advisor/requests",
        tone: "primary",
      },
      {
        label: "Local alerts",
        detail: "Review local weather pressure before you follow up with farmers.",
        href: "/app/weather",
        tone: "secondary",
      },
    ],
  },
  advisor: {
    eyebrow: "Advisory workspace",
    headline: "Handle the next request with clear guidance and visible support.",
    summary:
      "Open the next case, review what matters, and send practical advice with confidence.",
    dominantActionLabel: "Open requests",
    dominantActionHref: "/app/advisor/requests",
    queueTitle: "Cases to respond to",
    proofTitle: "What needs closer judgment",
    confidenceNote: "Open cases, human review needs, and recent guidance stay visible while you respond.",
    nextStepNote: "Resume the next open case or create a new guidance request when support starts elsewhere.",
    fieldMode: "Mobile and tablet views keep the next advisory action and recent context in easy reach.",
    deskMode: "Desktop layouts help compare case details and move quickly between open requests.",
    trustNote: "Advice stays grounded in the case, the context, and the next clear action.",
    tasks: [
      {
        label: "Open cases",
        detail: "Continue the requests that still need a response or closer review.",
        href: "/app/advisor/requests",
        tone: "primary",
      },
      {
        label: "New request",
        detail: "Start a new guidance request when a fresh case needs follow-up.",
        href: "/app/advisory/new",
        tone: "secondary",
      },
    ],
  },
  finance: {
    eyebrow: "Finance workspace",
    headline: "Review payments, disputes, and money on hold.",
    summary:
      "Keep the next finance decision visible with the right transaction context in front of you.",
    dominantActionLabel: "Open finance review",
    dominantActionHref: "/app/finance/queue",
    queueTitle: "What needs finance action",
    proofTitle: "Recent settlement movement",
    confidenceNote: "Money on hold, disputes, and recent settlement movement stay visible in one place.",
    nextStepNote: "Open the next review case and work forward from the highest-priority item.",
    fieldMode: "Compact layouts keep the next money decision and its context visible without overload.",
    deskMode: "Desktop layouts prioritize review flow, payment context, and recent resolutions.",
    trustNote: "Finance work stays clear, internal, and task-first without exposing low-level system terms.",
    tasks: [
      {
        label: "Review cases",
        detail: "Open the current payment and dispute cases waiting on finance.",
        href: "/app/finance/queue",
        tone: "primary",
      },
      {
        label: "View wallet",
        detail: "Review wallet activity and held funds beside the next finance case.",
        href: "/app/payments/wallet",
        tone: "secondary",
      },
    ],
  },
  admin: {
    eyebrow: "Internal admin view",
    headline: "See platform health and move into the right operating tool.",
    summary:
      "Use this internal overview to spot issues quickly and jump into analytics, support, or demo operations.",
    dominantActionLabel: "Open analytics",
    dominantActionHref: "/app/admin/analytics",
    queueTitle: "Platform health",
    proofTitle: "Recent internal events",
    confidenceNote: "Platform health, open risks, and internal events stay visible before you move deeper.",
    nextStepNote: "Open analytics or move into the team surface that fits the issue in front of you.",
    fieldMode: "Mobile access trims the experience to the most important health checks.",
    deskMode: "Larger screens keep health, updates, and internal tools visible together.",
    trustNote: "Internal-only surfaces stay clearly marked and separated from customer work.",
    tasks: [
      {
        label: "Health review",
        detail: "Review platform health and the current release picture in admin analytics.",
        href: "/app/admin/analytics",
        tone: "primary",
      },
      {
        label: "Demo tools",
        detail: "Open the demo-only workspace used during guided walkthroughs.",
        href: "/app/admin/demo-operator",
        tone: "secondary",
      },
    ],
  },
};

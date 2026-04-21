import { RoleKey } from "./design-tokens";

export type QueueItem = {
  id: string;
  title: string;
  detail: string;
  priority: "urgent" | "today" | "planned";
  proof?: string;
};

export type ProofItem = {
  label: string;
  value: string;
};

export type RoleDefinition = {
  key: RoleKey;
  label: string;
  strapline: string;
  homeTitle: string;
  homeSummary: string;
  accent: string;
  queue: QueueItem[];
  metrics: { label: string; value: string; change: string }[];
};

export const roleDefinitions: RoleDefinition[] = [
  {
    key: "farmer",
    label: "Farmer",
    strapline: "Field-first selling, settlement, and advisory follow-up.",
    homeTitle: "Today on your farm queue",
    homeSummary:
      "Start with time-sensitive work, then move into listings, offers, and evidence capture.",
    accent: "var(--tone-farmer)",
    queue: [
      {
        id: "farmer-1",
        title: "Confirm buyer offer for Grade A maize",
        detail: "Buyer Kivu Foods is waiting on quantity confirmation before escrow starts.",
        priority: "urgent",
        proof: "Price proof attached from 2 verified buyers",
      },
      {
        id: "farmer-2",
        title: "Upload moisture meter photo",
        detail: "Quality evidence keeps this listing visible to enterprise buyers.",
        priority: "today",
      },
      {
        id: "farmer-3",
        title: "Review rain alert recommendations",
        detail: "Two actions are recommended in the next 18 hours for Nyagatare.",
        priority: "planned",
      },
    ],
    metrics: [
      { label: "Open offers", value: "04", change: "+2 this week" },
      { label: "Queued actions", value: "03", change: "1 offline sync waiting" },
      { label: "Settlement pace", value: "2.6d", change: "12% faster" },
    ],
  },
  {
    key: "buyer",
    label: "Buyer",
    strapline: "Evidence-backed sourcing and negotiation follow-through.",
    homeTitle: "Sourcing work that needs attention",
    homeSummary:
      "Filter quickly, inspect proof inline, and move active negotiations to closure.",
    accent: "var(--tone-buyer)",
    queue: [
      {
        id: "buyer-1",
        title: "Respond to counter-offer from Green Valley Cooperative",
        detail: "Price changed by 3%. Dispatch window remains the same.",
        priority: "urgent",
        proof: "Quality certificate updated 45 minutes ago",
      },
      {
        id: "buyer-2",
        title: "Review 6 newly verified cassava listings",
        detail: "All six listings match your preferred moisture threshold.",
        priority: "today",
      },
      {
        id: "buyer-3",
        title: "Check escrow milestone before release",
        detail: "Transport receipt and delivery evidence are ready for inspection.",
        priority: "planned",
      },
    ],
    metrics: [
      { label: "Active negotiations", value: "08", change: "3 closing today" },
      { label: "Matched listings", value: "24", change: "7 new since yesterday" },
      { label: "Avg. proof review", value: "11m", change: "2m faster" },
    ],
  },
  {
    key: "cooperative",
    label: "Cooperative",
    strapline: "Member oversight, bulk operations, and dispatch clarity.",
    homeTitle: "Operational queues across your members",
    homeSummary:
      "Use the queue to clear member blockers, keep quality moving, and coordinate dispatch.",
    accent: "var(--tone-cooperative)",
    queue: [
      {
        id: "coop-1",
        title: "Approve 12-member bulk listing batch",
        detail: "Three lots need quality sign-off before publication.",
        priority: "urgent",
      },
      {
        id: "coop-2",
        title: "Resolve dispatch exception for Lot 21",
        detail: "Receiver timestamp is missing from the proof chain.",
        priority: "today",
        proof: "Traceability timeline shows the missing handoff",
      },
      {
        id: "coop-3",
        title: "Review climate outreach completion",
        detail: "9 members still need irrigation advice acknowledgement.",
        priority: "planned",
      },
    ],
    metrics: [
      { label: "Members in motion", value: "126", change: "18 with active listings" },
      { label: "Quality holds", value: "05", change: "Down from 9" },
      { label: "Dispatch completion", value: "92%", change: "+6 pts" },
    ],
  },
  {
    key: "advisor",
    label: "Advisor",
    strapline: "Fast triage, plain-language guidance, and citation visibility.",
    homeTitle: "Advisory follow-up and climate triage",
    homeSummary:
      "Move through urgent questions first and keep every answer tied to proof.",
    accent: "var(--tone-advisor)",
    queue: [
      {
        id: "advisor-1",
        title: "Answer fungal risk question for maize cluster",
        detail: "The farmer already attached field photos and weather context.",
        priority: "urgent",
        proof: "2 agronomy citations required before send",
      },
      {
        id: "advisor-2",
        title: "Review severe wind alert follow-up",
        detail: "Three farmers asked for next-step guidance after yesterday's alert.",
        priority: "today",
      },
      {
        id: "advisor-3",
        title: "Log intervention summary for cooperative visit",
        detail: "This keeps field support visible to finance and climate teams.",
        priority: "planned",
      },
    ],
    metrics: [
      { label: "Open requests", value: "17", change: "6 need same-day reply" },
      { label: "Citation coverage", value: "98%", change: "+3 pts" },
      { label: "Median reply time", value: "34m", change: "7m faster" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    strapline: "Decision support with policy, partner, and payout evidence in view.",
    homeTitle: "Review work for partner and payout decisions",
    homeSummary:
      "Keep the decision queue tight and never separate approvals from their proof chain.",
    accent: "var(--tone-finance)",
    queue: [
      {
        id: "finance-1",
        title: "Review insurer rejection for claim AG-2231",
        detail: "Weather evidence and delivery chain disagree with the rejection code.",
        priority: "urgent",
        proof: "3 proof sources available for audit",
      },
      {
        id: "finance-2",
        title: "Approve seller payout after delivery confirmation",
        detail: "All required traceability events are present.",
        priority: "today",
      },
      {
        id: "finance-3",
        title: "Inspect settlement delays over SLA",
        detail: "Two partners crossed the 48-hour review threshold.",
        priority: "planned",
      },
    ],
    metrics: [
      { label: "Pending decisions", value: "14", change: "4 urgent" },
      { label: "Avg. decision cycle", value: "5.2h", change: "18% faster" },
      { label: "Audit-ready cases", value: "100%", change: "No missing proof" },
    ],
  },
  {
    key: "admin",
    label: "Admin",
    strapline: "Cross-country operations, health posture, and readiness oversight.",
    homeTitle: "Platform health and rollout work",
    homeSummary:
      "See what is blocked, what is drifting, and where teams need intervention.",
    accent: "var(--tone-admin)",
    queue: [
      {
        id: "admin-1",
        title: "Investigate sync failure spike in rural district cluster",
        detail: "Offline retries increased after the latest radio coverage drop.",
        priority: "urgent",
      },
      {
        id: "admin-2",
        title: "Review country rollout readiness for Tanzania",
        detail: "Consent copy and finance access policy still need sign-off.",
        priority: "today",
      },
      {
        id: "admin-3",
        title: "Check notification delivery lag report",
        detail: "WhatsApp confirmations are outside the expected latency budget.",
        priority: "planned",
      },
    ],
    metrics: [
      { label: "Healthy services", value: "18/20", change: "2 degraded" },
      { label: "Countries live", value: "04", change: "1 in review" },
      { label: "PWA sync success", value: "97.8%", change: "+0.6 pts" },
    ],
  },
];

export const proofItems: ProofItem[] = [
  { label: "Country pack", value: "Rwanda v3.2 approved" },
  { label: "Connectivity mode", value: "Offline-safe queue enabled" },
  { label: "Trust signal", value: "Evidence drawer available on key actions" },
];

export const listings = [
  {
    id: "maize-lot-204",
    title: "Premium maize, 12 tonnes",
    location: "Nyagatare, Rwanda",
    price: "$322 / tonne",
    seller: "Green Valley Cooperative",
    summary: "Machine-dried maize with moisture certificate and sealed storage proof.",
    status: "Verified",
  },
  {
    id: "beans-lot-118",
    title: "Red beans, 7 tonnes",
    location: "Gicumbi, Rwanda",
    price: "$481 / tonne",
    seller: "Kora Farmers Group",
    summary: "Sorted and bagged stock with dispatch-ready packaging.",
    status: "Offer pending",
  },
  {
    id: "cassava-lot-077",
    title: "Cassava chips, 4 tonnes",
    location: "Musanze, Rwanda",
    price: "$268 / tonne",
    seller: "Amahoro Growers",
    summary: "Freshly processed chips with drying proof and route estimate.",
    status: "Needs transport plan",
  },
];

export const negotiationTimeline = [
  "Buyer submitted revised price and delivery window.",
  "Seller added fresh quality proof for the same lot.",
  "Escrow recommendation is ready once quantity is confirmed.",
];

export const walletMilestones = [
  "Escrow funded",
  "Dispatch verified",
  "Delivery confirmed",
  "Release scheduled",
];

export const climateAlerts = [
  {
    id: "storm-204",
    title: "Heavy rain expected in the next 18 hours",
    summary: "Protect stored grain and delay transport loading until rainfall drops.",
    severity: "High",
  },
  {
    id: "wind-118",
    title: "Strong wind risk for exposed drying areas",
    summary: "Move drying tarps to covered storage and secure loose bagging.",
    severity: "Medium",
  },
];

export const financeQueue = [
  {
    id: "case-2231",
    title: "Insurance review for delayed harvest claim",
    reason: "Partner rejection conflicts with rainfall evidence",
    state: "Needs review",
  },
  {
    id: "case-2240",
    title: "Seller payout after confirmed delivery",
    reason: "Escrow released, proof chain complete",
    state: "Ready to approve",
  },
];

export const notifications = [
  "Counter-offer received from Kivu Foods.",
  "Outbox synced 2 queued actions after network recovery.",
  "Climate advisory updated for heavy rain zone.",
];

export function getRoleDefinition(role: string) {
  return roleDefinitions.find((item) => item.key === role) ?? roleDefinitions[0];
}

export function getListing(id: string) {
  return listings.find((item) => item.id === id) ?? listings[0];
}

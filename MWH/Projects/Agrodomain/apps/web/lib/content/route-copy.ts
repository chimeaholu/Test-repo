export type ExperienceLocale = "en-GH" | "fr-CI" | "sw-KE";

type LandingCopy = {
  eyebrow: string;
  title: string;
  body: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  highlights: Array<{ title: string; body: string }>;
  designCallout: { title: string; body: string };
  mobileCallout: { title: string; body: string };
};

type SignInCopy = {
  title: string;
  body: string;
  fieldRule: string;
  riskRule: string;
  shellBody: string;
};

type ConsentCopy = {
  onboardingEyebrow: string;
  policyVersion: string;
  onboardingBody: string;
  identityLoadedBody: string;
  accessBody: string;
  plainLanguageRule: string;
  contractBody: string;
};

type OfflineOutboxCopy = {
  eyebrow: string;
  title: string;
  body: string;
};

type AdvisoryCopy = {
  historyEyebrow: string;
  historyTitle: string;
  historyBody: string;
  localeFallback: string;
  runtimeFallback: string;
  runtimeLive: string;
  reviewerLabel: string;
  citationsLabel: string;
  transcriptLabel: string;
  blockedCopy: string;
  hitlCopy: string;
  emptyCopy: string;
  loadingCopy: string;
};

type ClimateCopy = {
  runtimeLive: string;
  runtimeFallback: string;
  loadingCopy: string;
};

type WalletCopy = {
  body: string;
};

export function resolveExperienceLocale(input: string | null | undefined): ExperienceLocale {
  if (!input) {
    return "en-GH";
  }
  if (input === "fr-CI" || input === "sw-KE" || input === "en-GH") {
    return input;
  }
  const language = input.split("-")[0];
  if (language === "fr") {
    return "fr-CI";
  }
  if (language === "sw") {
    return "sw-KE";
  }
  return "en-GH";
}

export const landingCopy: LandingCopy = {
  eyebrow: "Agricultural operations platform",
  title: "Run marketplace, operations, finance, and field decisions from one trusted workspace.",
  body:
    "Agrodomain routes every actor to the right workspace, keeps access and consent explicit, and preserves work when connectivity drops so teams can keep operating without guesswork.",
  primaryActionLabel: "Open sign in",
  secondaryActionLabel: "Review recovery tools",
  highlights: [
    {
      title: "Role-specific workspaces",
      body: "Farmers, buyers, cooperative teams, advisors, finance teams, and admins each land on the work that matters next.",
    },
    {
      title: "Access you can explain",
      body: "Sign-in and consent stay explicit so regulated actions never unlock behind a silent redirect or hidden policy check.",
    },
    {
      title: "Recovery built into the workflow",
      body: "Queue depth, replay order, and conflict handling stay visible so teams know what is pending, what failed, and what to do next.",
    },
  ],
  designCallout: {
    title: "Designed for operational trust",
    body: "The interface favors plain-language actions, clear hierarchy, and visible evidence instead of decorative dashboard noise.",
  },
  mobileCallout: {
    title: "Built for mobile and desktop",
    body: "Primary actions stay reachable on small screens while larger layouts expand into richer review surfaces without changing the task flow.",
  },
};

export const signInCopy: SignInCopy = {
  title: "Open the right workspace with trust checks visible from the first screen.",
  body:
    "Enter your name, work email, role, and operating country. Agrodomain routes you to the correct workspace, then asks for permission review before any protected work begins.",
  fieldRule: "Use the same identity details your team already uses so handoffs, recovery, and account history remain clear.",
  riskRule: "Signing in identifies you. It does not authorize regulated actions until consent is granted.",
  shellBody: "Choose the role and country that match the work you need to resume today.",
};

export const consentCopy: ConsentCopy = {
  onboardingEyebrow: "Consent and access",
  policyVersion: "2026.04.w1",
  onboardingBody: "Review what will be recorded, why it is needed, and which actions remain locked until you agree.",
  identityLoadedBody: "Role, country, and contact details carry over from sign-in so you can confirm you are granting access in the right context.",
  accessBody: "Once consent is granted, your workspace opens with the same policy checks still enforced on the server.",
  plainLanguageRule:
    "Keep the explanation concrete: what is recorded, why it is required, and what stays blocked if you do not agree.",
  contractBody: "Select the permissions you accept. The policy version and capture time are stored as soon as consent is granted.",
};

export const offlineOutboxCopy: OfflineOutboxCopy = {
  eyebrow: "Offline recovery",
  title: "Outbox and replay controls",
  body:
    "Queued work stays in context, replay order stays deterministic, and each item exposes the envelope metadata the transport requires.",
};

export const advisoryCopyByLocale: Record<ExperienceLocale, AdvisoryCopy> = {
  "en-GH": {
    historyEyebrow: "AgroGuide requests",
    historyTitle: "Recommended guidance with the supporting context close by",
    historyBody:
      "Keep the farmer's question, the recommended guidance, and the supporting context in one place before you send an answer forward.",
    localeFallback: "This language is not available yet. Showing the closest supported advisory language for now.",
    runtimeFallback:
      "Live updates are still catching up. You can keep working from the latest saved guidance and source detail without losing context.",
    runtimeLive: "You are viewing the latest advisory updates.",
    reviewerLabel: "Review note",
    citationsLabel: "Supporting sources",
    transcriptLabel: "Supporting history",
    blockedCopy: "This answer should stay on hold until a reviewer clears it or revises the guidance.",
    hitlCopy: "A person still needs to confirm this answer before it should be shared as field guidance.",
    emptyCopy: "No AgroGuide requests are available for this language yet.",
    loadingCopy: "Loading AgroGuide requests...",
  },
  "fr-CI": {
    historyEyebrow: "Conversation de conseil",
    historyTitle: "Conseil fonde avec etat du controle",
    historyBody:
      "Chaque reponse conserve les citations, le niveau de confiance et la posture du controle avant d'etre traitee comme un conseil de terrain.",
    localeFallback: "La langue demandee n'est pas encore disponible. La langue de conseil la plus proche est affichee.",
    runtimeFallback:
      "Les mises a jour en direct sont encore en cours de stabilisation. Cet espace continue d'afficher la version confirmee la plus recente.",
    runtimeLive: "Cette conversation affiche les dernieres mises a jour de conseil en direct.",
    reviewerLabel: "Decision du controle",
    citationsLabel: "Citations",
    transcriptLabel: "Transcription de la conversation",
    blockedCopy:
      "La diffusion est bloquee. Ne reprenez pas ce conseil comme valide tant que le controle ne l'a pas revise.",
    hitlCopy: "Une revue humaine est requise avant de livrer ce conseil.",
    emptyCopy: "Aucune conversation de conseil n'est encore disponible pour cette langue.",
    loadingCopy: "Chargement de la conversation de conseil...",
  },
  "sw-KE": {
    historyEyebrow: "Mazungumzo ya ushauri",
    historyTitle: "Mwongozo wenye ushahidi na hali ya mkaguzi",
    historyBody:
      "Kila jibu linaonesha nukuu, kiwango cha uhakika, na hali ya mkaguzi kabla halijachukuliwa kama ushauri wa shambani.",
    localeFallback: "Lugha uliyoomba haijapatikana bado. Tunaonyesha lugha ya karibu inayotumika.",
    runtimeFallback:
      "Masasisho ya moja kwa moja bado yanaimarishwa. Muonekano huu unaendelea kuonyesha toleo la mwisho lililothibitishwa.",
    runtimeLive: "Mazungumzo haya yanaonyesha masasisho ya ushauri ya moja kwa moja.",
    reviewerLabel: "Uamuzi wa mkaguzi",
    citationsLabel: "Nukuu",
    transcriptLabel: "Mtiririko wa mazungumzo",
    blockedCopy:
      "Utoaji umezuiwa. Usiseme hii kama ushauri uliokubaliwa mpaka mkaguzi aondoe zuio au arekebishe.",
    hitlCopy: "Mapitio ya binadamu yanahitajika kabla ya jibu kuoneshwa kama ushauri uliotolewa.",
    emptyCopy: "Hakuna mazungumzo ya ushauri kwa lugha hii bado.",
    loadingCopy: "Inapakia mazungumzo ya ushauri...",
  },
};

export const climateCopy: ClimateCopy = {
  runtimeLive: "Alerts and forecasts are coming from the latest climate updates.",
  runtimeFallback:
    "Fresh climate updates are delayed. This view keeps the latest saved forecast and field context available so planning can continue carefully.",
  loadingCopy: "Loading weather alerts and field outlook...",
};

export const walletCopy: WalletCopy = {
  body:
    "Wallet balances, escrow activity, and settlement exceptions stay visible in one place so finance and operations teams can act with clear ledger context.",
};

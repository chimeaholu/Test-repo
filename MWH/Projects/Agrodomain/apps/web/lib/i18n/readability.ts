import { activeLocaleCodes, type ActiveLocaleCode } from "@/lib/i18n/config";
import { listCatalogStrings, messageGovernance } from "@/lib/i18n/messages";

export interface ReadabilityAssessment {
  averageWordsPerSentence: number;
  flaggedTerms: string[];
  longSentenceCount: number;
  passes: boolean;
  sentenceCount: number;
  wordCount: number;
}

const flaggedTermPatterns = [
  /\bcanonical\b/iu,
  /\bruntime\b/iu,
  /\butili[sz]e\b/iu,
  /\btherefore\b/iu,
  /\bidempotency\b/iu,
];

export function assessPlainLanguageCopy(text: string): ReadabilityAssessment {
  const normalized = text.replace(/\s+/g, " ").trim();
  const sentences = normalized
    .split(/[.!?]+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const words = normalized.match(/[A-Za-z0-9'-]+/gu) ?? [];
  const averageWordsPerSentence = sentences.length
    ? words.length / sentences.length
    : words.length;
  const longSentenceCount = sentences.filter((sentence) => {
    const sentenceWords = sentence.match(/[A-Za-z0-9'-]+/gu) ?? [];
    return sentenceWords.length > 18;
  }).length;
  const flaggedTerms = flaggedTermPatterns
    .filter((pattern) => pattern.test(normalized))
    .map((pattern) => pattern.source.replace(/\\b|\(|\)|\/iu/gu, ""));

  return {
    averageWordsPerSentence,
    flaggedTerms,
    longSentenceCount,
    passes:
      averageWordsPerSentence <= 16 &&
      longSentenceCount === 0 &&
      flaggedTerms.length === 0,
    sentenceCount: sentences.length,
    wordCount: words.length,
  };
}

export function validateLocaleCatalog(locale: ActiveLocaleCode): Array<{
  assessment: ReadabilityAssessment;
  key: string;
  locale: ActiveLocaleCode;
}> {
  return Object.entries(listCatalogStrings(locale))
    .map(([key, value]) => ({
      assessment: assessPlainLanguageCopy(value),
      key,
      locale,
    }))
    .filter((item) => !item.assessment.passes);
}

export function validateLocaleGovernanceCoverage(): string[] {
  const namespaces = Object.keys(messageGovernance);
  return Array.from(
    new Set(
      activeLocaleCodes.flatMap((locale) =>
        Object.keys(listCatalogStrings(locale)).filter(
          (key) => !namespaces.some((namespace) => key === namespace || key.startsWith(`${namespace}.`)),
        ),
      ),
    ),
  );
}

export function validateAllActiveLocaleCatalogs(): Array<{
  assessment: ReadabilityAssessment;
  key: string;
  locale: ActiveLocaleCode;
}> {
  return activeLocaleCodes.flatMap((locale) => validateLocaleCatalog(locale));
}

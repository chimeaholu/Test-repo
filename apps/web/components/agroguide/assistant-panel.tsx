"use client";

import type { AdvisoryTranscriptEntry } from "@agrodomain/contracts";
import React, { startTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppState } from "@/components/app-provider";
import { CloseIcon } from "@/components/icons";
import { sortAdvisoryItems, type AdvisoryViewModel } from "@/features/advisory/model";
import { advisoryApi } from "@/lib/api/advisory";
import { sendCommand } from "@/lib/api-client";
import { recordTelemetry } from "@/lib/telemetry/client";

import {
  AgroGuideChatInterface,
  type AgroGuideChatMessage,
} from "./chat-interface";
import { ContextualSuggestions, buildContextualSuggestions } from "./contextual-suggestions";
import { CropDiagnosis, type CropDiagnosisState } from "./crop-diagnosis";

type AdvisoryItem = Awaited<ReturnType<typeof advisoryApi.listConversations>>["data"]["items"][number];

interface AgroGuideAssistantPanelProps {
  onClose: () => void;
  open: boolean;
}

type SpeechRecognitionLike = {
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult:
    | ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  start: () => void;
};

type WindowWithSpeech = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

function buildTopic(input: string, fallback: string): string {
  const normalized = input.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return fallback;
  }
  if (normalized.length <= 72) {
    return normalized;
  }
  return `${normalized.slice(0, 69)}...`;
}

function assistantNote(item: AdvisoryViewModel): string | undefined {
  if (item.status === "hitl_required") {
    return "Held for human review";
  }
  if (item.status === "blocked") {
    return "Blocked by policy or evidence threshold";
  }
  if (item.status === "revised") {
    return "Revised before delivery";
  }
  return undefined;
}

function buildConversationMessages(
  items: AdvisoryItem[],
  feedback: Record<string, "negative" | "positive" | null>,
): AgroGuideChatMessage[] {
  const ordered = [...items]
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .slice(-4);

  const messages: AgroGuideChatMessage[] = [
    {
      confidence: "high",
      feedback: feedback["agroguide-welcome"] ?? null,
      id: "agroguide-welcome",
      role: "assistant",
      sources: ["General platform guidance"],
      text: "Hello! I'm AgroGuide, your farming assistant. How can I help you today?",
    },
  ];

  for (const item of ordered) {
    messages.push({
      feedback: null,
      id: `${item.advisory_request_id}-question`,
      role: "user",
      sources: [],
      text: item.question_text,
    });
    messages.push({
      confidence: item.confidence_band,
      feedback: feedback[item.advisory_request_id] ?? null,
      id: item.advisory_request_id,
      role: "assistant",
      sources: item.citations.map((citation) => citation.title),
      status: assistantNote(item),
      text: item.response_text,
    });
  }

  return messages;
}

function buildQuestionPrompt(message: string, pathname: string): string {
  const trimmed = message.trim();
  if (trimmed.length >= 12) {
    return trimmed;
  }

  return `${trimmed} Please answer using the context from ${pathname}.`;
}

export function AgroGuideAssistantPanel({
  onClose,
  open,
}: AgroGuideAssistantPanelProps) {
  const { queue, session, traceId } = useAppState();
  const pathname = usePathname() ?? "/app";
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<AdvisoryItem[]>([]);
  const [feedback, setFeedback] = useState<Record<string, "negative" | "positive" | null>>({});
  const [localMessages, setLocalMessages] = useState<AgroGuideChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runtimeMode, setRuntimeMode] = useState<"fallback" | "live">("fallback");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<CropDiagnosisState | null>(null);
  const isOffline = queue.connectivity_state === "offline";
  const suggestions = buildContextualSuggestions(pathname, session?.actor.role ?? "farmer");

  const baseMessages = buildConversationMessages(items, feedback);
  const messages = localMessages.length ? [...baseMessages, ...localMessages] : baseMessages;
  const promptCountLabel = `${suggestions.length} suggestions ready`;

  async function refreshConversations(): Promise<AdvisoryItem[]> {
    if (!session) {
      return [];
    }

    const response = await advisoryApi.listConversations(traceId, session.actor.locale);
    const nextItems = sortAdvisoryItems(response.data.items);
    startTransition(() => {
      setItems(nextItems);
      setRuntimeMode(response.data.runtime_mode);
    });
    return nextItems;
  }

  useEffect(() => {
    if (!open || !session) {
      return;
    }

    let cancelled = false;

    void refreshConversations()
      .then(() => {
        if (!cancelled) {
          setErrorMessage(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load AgroGuide.");
        }
      });

    recordTelemetry({
      detail: {
        path: pathname,
        runtime_mode: runtimeMode,
      },
      event: "agroguide_panel_opened",
      timestamp: new Date().toISOString(),
      trace_id: traceId,
    });

    return () => {
      cancelled = true;
    };
  }, [open, pathname, session, traceId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setInputValue("");
      setErrorMessage(null);
      setLocalMessages([]);
      setDiagnosis(null);
    }
  }, [open]);

  async function submitMessage(
    message: string,
    options?: {
      topic?: string;
      transcriptEntries?: AdvisoryTranscriptEntry[];
    },
  ): Promise<AdvisoryItem | null> {
    if (!session || isSubmitting) {
      return null;
    }

    if (isOffline) {
      setErrorMessage("AgroGuide is currently unavailable offline. Please check your connection.");
      return null;
    }

    const prompt = buildQuestionPrompt(message, pathname);
    if (prompt.trim().length < 12) {
      setErrorMessage("Please share a bit more detail so AgroGuide can ground the response.");
      return null;
    }

    const userMessage: AgroGuideChatMessage = {
      feedback: null,
      id: `local-user-${Date.now()}`,
      role: "user",
      sources: [],
      text: prompt,
    };
    const assistantMessage: AgroGuideChatMessage = {
      feedback: null,
      id: `local-assistant-${Date.now()}`,
      loading: true,
      role: "assistant",
      sources: runtimeMode === "live" ? ["Advisory workflow"] : ["Reference advisory fixtures"],
      text:
        options?.topic === "Crop photo diagnosis"
          ? "Analyzing image..."
          : "AgroGuide is checking grounded sources before responding.",
    };

    setErrorMessage(null);
    setIsSubmitting(true);
    setLocalMessages([userMessage, assistantMessage]);

    try {
      const result = await sendCommand(
        {
          actorId: session.actor.actor_id,
          aggregateRef: "advisory",
          commandName: "advisory.requests.submit",
          countryCode: session.actor.country_code,
          dataCheckIds: ["DI-005"],
          input: {
            locale: session.actor.locale,
            policy_context: { sensitive_topics: [] },
            question_text: prompt,
            topic: options?.topic ?? buildTopic(prompt, "AgroGuide request"),
            transcript_entries: options?.transcriptEntries ?? [],
          },
          journeyIds: ["CJ-010"],
          mutationScope: "advisory.requests",
          traceId,
        },
        traceId,
      );

      const nextItems = await refreshConversations();
      const latestItem =
        nextItems.find((item) => item.request_id === result.data.request_id) ?? nextItems[0] ?? null;

      recordTelemetry({
        detail: {
          latest_request_id: latestItem?.request_id ?? null,
          path: pathname,
          topic: options?.topic ?? buildTopic(prompt, "AgroGuide request"),
        },
        event: "agroguide_message_submitted",
        timestamp: new Date().toISOString(),
        trace_id: traceId,
      });

      setInputValue("");
      setLocalMessages([]);
      return latestItem;
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : "Sorry, I couldn't process that. Please try again.";
      setErrorMessage("Sorry, I couldn't process that. Please try again.");
      setLocalMessages([
        userMessage,
        {
          feedback: null,
          id: `local-error-${Date.now()}`,
          role: "assistant",
          sources: [],
          status: fallbackMessage,
          text: "Sorry, I couldn't process that. Please try again.",
        },
      ]);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSend(): Promise<void> {
    const nextValue = inputValue.trim();
    if (!nextValue) {
      return;
    }

    await submitMessage(nextValue);
  }

  async function handleSuggestionSelect(
    suggestion: ReturnType<typeof buildContextualSuggestions>[number],
  ): Promise<void> {
    if (suggestion.action === "focus") {
      inputRef.current?.focus();
      return;
    }

    if (suggestion.action === "diagnosis") {
      fileInputRef.current?.click();
      return;
    }

    setInputValue(suggestion.prompt ?? "");
    if (suggestion.prompt) {
      await submitMessage(suggestion.prompt, { topic: suggestion.label });
    }
  }

  async function handleFileSelection(file: File | null): Promise<void> {
    if (!file) {
      return;
    }

    const transcriptEntries: AdvisoryTranscriptEntry[] = [
      {
        captured_at: new Date().toISOString(),
        channel: "pwa",
        message: `Uploaded image ${file.name} (${file.type || "image"}, ${file.size} bytes).`,
        speaker: "user",
      },
      {
        captured_at: new Date().toISOString(),
        channel: "pwa",
        message: `Current page context: ${pathname}`,
        speaker: "system",
      },
    ];

    setDiagnosis({
      fileName: file.name,
      sources: [],
      status: "analyzing",
    });

    const item = await submitMessage(
      `Review the uploaded crop image named ${file.name} and give me a likely diagnosis, confidence, immediate action, and any safe follow-up steps.`,
      {
        topic: "Crop photo diagnosis",
        transcriptEntries,
      },
    );

    if (!item) {
      setDiagnosis({
        fileName: file.name,
        sources: [],
        status: "error",
        summary: "Sorry, I couldn't process that. Please try again.",
      });
      return;
    }

    setDiagnosis({
      confidence: item.confidence_band,
      fileName: file.name,
      issue: item.topic,
      recommendation:
        item.status === "hitl_required"
          ? "A reviewer still needs to confirm any sensitive treatment guidance."
          : "Use the grounded response below as the next safe action and cross-check the cited sources.",
      sources: item.citations.map((citation) => citation.title),
      status: "ready",
      summary: item.response_text,
    });
  }

  function handleFeedback(messageId: string, rating: "negative" | "positive"): void {
    setFeedback((current) => ({ ...current, [messageId]: rating }));
    recordTelemetry({
      detail: {
        message_id: messageId,
        rating,
      },
      event: "agroguide_feedback_recorded",
      timestamp: new Date().toISOString(),
      trace_id: traceId,
    });
  }

  function handleVoice(): void {
    const speechWindow = window as WindowWithSpeech;
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setErrorMessage("Voice input is not available on this device.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = session?.actor.locale ?? "en-GH";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onerror = () => {
      setErrorMessage("Voice input is not available on this device.");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInputValue(transcript);
        inputRef.current?.focus();
      }
    };
    recognition.onend = () => undefined;
    recognition.start();
  }

  if (!open || !session) {
    return null;
  }

  return (
    <div className="agroguide-overlay">
      <button
        aria-hidden="true"
        className="agroguide-backdrop"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />

      <aside
        aria-label="AgroGuide AI assistant"
        className="agroguide-panel"
        role="dialog"
      >
        <header className="agroguide-panel-header">
          <div>
            <strong>AgroGuide</strong>
            <span>{runtimeMode === "live" ? "Live advisory" : "Reference advisory"} · {promptCountLabel}</span>
          </div>
          <button
            aria-label="Close AgroGuide"
            className="agroguide-close"
            onClick={onClose}
            type="button"
          >
            <CloseIcon size={18} />
          </button>
        </header>

        <div className="agroguide-panel-body">
          <ContextualSuggestions
            onSelect={(suggestion) => {
              void handleSuggestionSelect(suggestion);
            }}
            suggestions={suggestions}
          />

          <CropDiagnosis diagnosis={diagnosis} onDismiss={() => setDiagnosis(null)} />

          {errorMessage ? (
            <div className="agroguide-error-banner" role="alert">
              {errorMessage}
            </div>
          ) : null}

          <AgroGuideChatInterface
            inputRef={inputRef}
            isOffline={isOffline}
            isSubmitting={isSubmitting}
            messages={messages}
            onCamera={() => fileInputRef.current?.click()}
            onFeedback={handleFeedback}
            onInputChange={setInputValue}
            onSend={() => {
              void handleSend();
            }}
            onVoice={handleVoice}
            value={inputValue}
          />

          <div className="agroguide-footer">
            <Link className="agroguide-history-link" href="/app/advisory/new">
              View Conversation History
            </Link>
            <span className="agroguide-footer-note">
              Context: {pathname.replace("/app/", "").replaceAll("/", " / ")}
            </span>
          </div>
        </div>

        <input
          accept="image/*"
          capture="environment"
          className="agroguide-hidden-input"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            event.target.value = "";
            void handleFileSelection(file);
          }}
          ref={fileInputRef}
          type="file"
        />
      </aside>
    </div>
  );
}

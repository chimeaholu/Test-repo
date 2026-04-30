"use client";

import React, { useEffect, useRef } from "react";

import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";

import { CameraIcon, MicIcon, SendIcon } from "@/components/icons";

export interface AgroGuideChatMessage {
  confidence?: "high" | "low" | "medium";
  feedback?: "negative" | "positive" | null;
  id: string;
  loading?: boolean;
  role: "assistant" | "system" | "user";
  sources: string[];
  status?: string;
  text: string;
}

interface AgroGuideChatInterfaceProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  isOffline: boolean;
  isSubmitting: boolean;
  messages: AgroGuideChatMessage[];
  onCamera: () => void;
  onFeedback: (messageId: string, rating: "negative" | "positive") => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onVoice: () => void;
  value: string;
}

function confidenceLabel(confidence: AgroGuideChatMessage["confidence"]): string {
  if (confidence === "high") return "High";
  if (confidence === "medium") return "Medium";
  if (confidence === "low") return "Low";
  return "Reference";
}

export function AgroGuideChatInterface({
  inputRef,
  isOffline,
  isSubmitting,
  messages,
  onCamera,
  onFeedback,
  onInputChange,
  onSend,
  onVoice,
  value,
}: AgroGuideChatInterfaceProps) {
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = logRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  return (
    <div className="agroguide-chat-shell">
      <div
        aria-live="polite"
        className="agroguide-chat-log"
        ref={logRef}
        role="log"
      >
        {messages.map((message) => (
          <article
            aria-label={
              message.role === "assistant"
                ? `AgroGuide says: ${message.text}`
                : message.role === "user"
                  ? `You said: ${message.text}`
                  : message.text
            }
            className={`agroguide-message agroguide-message-${message.role}`}
            key={message.id}
          >
            <div className="agroguide-message-body">
              <p>{message.text}</p>
              {message.loading ? <span className="agroguide-inline-meta">Checking grounded sources...</span> : null}
              {message.confidence ? (
                <div className="agroguide-confidence-row" aria-label={`Confidence: ${confidenceLabel(message.confidence)}`}>
                  <span className={`agroguide-confidence-bar agroguide-confidence-bar-${message.confidence}`} />
                  <span>{confidenceLabel(message.confidence)}</span>
                </div>
              ) : null}
              {message.status ? (
                <span className="agroguide-inline-meta">Status: {message.status.replaceAll("_", " ")}</span>
              ) : null}
              {message.sources.length ? (
                <span className="agroguide-inline-meta">Sources: {message.sources.join(", ")}</span>
              ) : null}
            </div>

            {message.role === "assistant" && !message.loading ? (
              <div className="agroguide-feedback-row">
                <button
                  aria-label="Rate this response as helpful"
                  className={`agroguide-feedback-button${
                    message.feedback === "positive" ? " is-active" : ""
                  }`}
                  onClick={() => onFeedback(message.id, "positive")}
                  type="button"
                >
                  <ThumbsUpIcon size={16} />
                </button>
                <button
                  aria-label="Rate this response as unhelpful"
                  className={`agroguide-feedback-button${
                    message.feedback === "negative" ? " is-active" : ""
                  }`}
                  onClick={() => onFeedback(message.id, "negative")}
                  type="button"
                >
                  <ThumbsDownIcon size={16} />
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {isOffline ? (
        <div className="agroguide-offline-banner" role="status">
          AgroGuide is currently unavailable offline. Please check your connection.
        </div>
      ) : null}

      <div className="agroguide-input-bar">
        <input
          aria-label="Ask AgroGuide a question"
          className="agroguide-input"
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          placeholder="Type your question..."
          ref={inputRef}
          type="text"
          value={value}
        />
        <button
          aria-label="Upload or take a photo for crop diagnosis"
          className="agroguide-input-icon"
          onClick={onCamera}
          type="button"
        >
          <CameraIcon size={18} />
        </button>
        <button
          aria-label="Use voice input"
          className="agroguide-input-icon"
          onClick={onVoice}
          type="button"
        >
          <MicIcon size={18} />
        </button>
        <button
          aria-label="Send AgroGuide message"
          className="agroguide-send-button"
          disabled={isSubmitting || isOffline || value.trim().length < 3}
          onClick={onSend}
          type="button"
        >
          <SendIcon size={18} />
        </button>
      </div>
    </div>
  );
}

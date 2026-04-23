"use client";

import type { ActorRole, IdentitySession } from "@agrodomain/contracts";
import { createContext, useContext } from "react";

// ---------------------------------------------------------------------------
// Storage keys (must match api-client.ts TOKEN_STORAGE_KEY)
// ---------------------------------------------------------------------------

export const SESSION_TOKEN_KEY = "agrodomain.session-token.v1";
export const SESSION_METADATA_KEY = "agrodomain.session.v1";

// ---------------------------------------------------------------------------
// Session state exposed through context
// ---------------------------------------------------------------------------

export interface AuthSessionState {
  actorId: string;
  role: ActorRole;
  countryCode: string;
  displayName: string;
  email: string;
  isAuthenticated: true;
  sessionToken: string;
}

export interface UnauthenticatedState {
  actorId: null;
  role: null;
  countryCode: null;
  displayName: null;
  email: null;
  isAuthenticated: false;
  sessionToken: null;
}

export type SessionState = AuthSessionState | UnauthenticatedState;

export interface SignInData {
  displayName: string;
  email: string;
  role: ActorRole;
  countryCode: string;
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface AuthContextValue extends SessionState {
  /** Whether the provider has finished checking localStorage on mount. */
  isReady: boolean;
  /** Sign in by calling the identity API. Throws on failure. */
  signIn: (data: SignInData) => Promise<void>;
  /** Clear session from state and localStorage. */
  signOut: () => void;
  /** Re-validate the current token against the API and refresh state. */
  refreshSession: () => Promise<void>;
}

const UNAUTHENTICATED: UnauthenticatedState = {
  actorId: null,
  role: null,
  countryCode: null,
  displayName: null,
  email: null,
  isAuthenticated: false,
  sessionToken: null,
};

export { UNAUTHENTICATED };

export const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

export function writeSessionToStorage(
  token: string,
  session: IdentitySession,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
  window.localStorage.setItem(SESSION_METADATA_KEY, JSON.stringify(session));
}

export function readSessionFromStorage(): {
  token: string;
  session: IdentitySession;
} | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(SESSION_TOKEN_KEY);
  const raw = window.localStorage.getItem(SESSION_METADATA_KEY);
  if (!token || !raw) return null;
  try {
    const session = JSON.parse(raw) as IdentitySession;
    return { token, session };
  } catch {
    return null;
  }
}

export function clearSessionFromStorage(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
  window.localStorage.removeItem(SESSION_METADATA_KEY);
}

export function sessionStateFromIdentity(
  token: string,
  session: IdentitySession,
): AuthSessionState {
  return {
    actorId: session.actor.actor_id,
    role: session.actor.role,
    countryCode: session.actor.country_code,
    displayName: session.actor.display_name,
    email: session.actor.email,
    isAuthenticated: true,
    sessionToken: token,
  };
}

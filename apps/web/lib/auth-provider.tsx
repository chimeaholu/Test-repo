"use client";

import type { IdentitySession } from "@agrodomain/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api-client";
import { ApiRequestError } from "@/lib/api-types";
import {
  AuthContext,
  type AuthContextValue,
  type AuthSessionState,
  type GrantConsentData,
  type SignInData,
  type UnauthenticatedState,
  UNAUTHENTICATED,
  clearSessionFromStorage,
  consentStateFromRecord,
  readSessionFromStorage,
  sessionStateFromIdentity,
  writeSessionToStorage,
} from "@/lib/auth-context";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionState, setSessionState] = useState<
    AuthSessionState | UnauthenticatedState
  >(UNAUTHENTICATED);
  const [identitySession, setIdentitySession] = useState<IdentitySession | null>(null);
  const [isReady, setIsReady] = useState(false);

  // -----------------------------------------------------------------------
  // On mount: rehydrate from localStorage, then validate with the API
  // -----------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function validateStoredSession() {
      const stored = readSessionFromStorage();

      if (!stored) {
        if (!cancelled) {
          setSessionState(UNAUTHENTICATED);
          setIsReady(true);
        }
        return;
      }

      // Optimistically populate state from localStorage while we validate
      if (!cancelled) {
        setSessionState(sessionStateFromIdentity(stored.token, stored.session));
        setIdentitySession(stored.session);
      }

      try {
        // GET /api/v1/identity/session validates the Bearer token server-side
        const validatedSession = await api.get<IdentitySession>(
          "/api/v1/identity/session",
        );

        if (!cancelled) {
          // Update localStorage with the freshest server data
          writeSessionToStorage(stored.token, validatedSession);
          setSessionState(
            sessionStateFromIdentity(stored.token, validatedSession),
          );
          setIdentitySession(validatedSession);
        }
      } catch (err) {
        // Token expired or invalid — clear everything
        if (!cancelled) {
          clearSessionFromStorage();
          setSessionState(UNAUTHENTICATED);
          setIdentitySession(null);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    void validateStoredSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------------------------------------
  // signIn
  // -----------------------------------------------------------------------

  const signIn = useCallback(async (data: SignInData): Promise<void> => {
    const response = await api.post<{
      access_token: string;
      session: IdentitySession;
    }>(
      "/api/v1/identity/session",
      {
        display_name: data.displayName,
        email: data.email,
        role: data.role,
        country_code: data.countryCode,
      },
      { noAuth: true },
    );

    writeSessionToStorage(response.access_token, response.session);
    setSessionState(
      sessionStateFromIdentity(response.access_token, response.session),
    );
    setIdentitySession(response.session);
  }, []);

  // -----------------------------------------------------------------------
  // signOut
  // -----------------------------------------------------------------------

  const signOut = useCallback(() => {
    clearSessionFromStorage();
    setSessionState(UNAUTHENTICATED);
    setIdentitySession(null);
  }, []);

  // -----------------------------------------------------------------------
  // refreshSession
  // -----------------------------------------------------------------------

  const refreshSession = useCallback(async (): Promise<void> => {
    const stored = readSessionFromStorage();
    if (!stored) {
      clearSessionFromStorage();
      setSessionState(UNAUTHENTICATED);
      return;
    }

    try {
      const session = await api.get<IdentitySession>(
        "/api/v1/identity/session",
      );
      writeSessionToStorage(stored.token, session);
      setSessionState(sessionStateFromIdentity(stored.token, session));
      setIdentitySession(session);
    } catch {
      clearSessionFromStorage();
      setSessionState(UNAUTHENTICATED);
      setIdentitySession(null);
    }
  }, []);

  // -----------------------------------------------------------------------
  // grantConsent
  // -----------------------------------------------------------------------

  const grantConsent = useCallback(
    async (data: GrantConsentData): Promise<void> => {
      const updatedSession = await api.post<IdentitySession>(
        "/api/v1/identity/consent",
        {
          policy_version: data.policyVersion,
          scope_ids: data.scopeIds,
          captured_at: new Date().toISOString(),
        },
      );

      const stored = readSessionFromStorage();
      if (stored) {
        writeSessionToStorage(stored.token, updatedSession);
        setSessionState(sessionStateFromIdentity(stored.token, updatedSession));
      } else {
        // Update only consent portion if storage was cleared
        setSessionState((prev) => {
          if (!prev.isAuthenticated) return prev;
          return {
            ...prev,
            consent: consentStateFromRecord(updatedSession.consent),
          };
        });
      }
      setIdentitySession(updatedSession);
    },
    [],
  );

  // -----------------------------------------------------------------------
  // revokeConsent
  // -----------------------------------------------------------------------

  const revokeConsent = useCallback(async (reason: string): Promise<void> => {
    const response = await api.post<{
      reason: string;
      session: IdentitySession;
    }>("/api/v1/identity/consent/revoke", { reason });

    const stored = readSessionFromStorage();
    if (stored) {
      writeSessionToStorage(stored.token, response.session);
      setSessionState(
        sessionStateFromIdentity(stored.token, response.session),
      );
    } else {
      setSessionState((prev) => {
        if (!prev.isAuthenticated) return prev;
        return {
          ...prev,
          consent: consentStateFromRecord(response.session.consent),
        };
      });
    }
    setIdentitySession(response.session);
  }, []);

  // -----------------------------------------------------------------------
  // Memoised context value
  // -----------------------------------------------------------------------

  const value = useMemo<AuthContextValue>(
    () => ({
      ...sessionState,
      isReady,
      identitySession,
      signIn,
      signOut,
      refreshSession,
      grantConsent,
      revokeConsent,
    }),
    [sessionState, isReady, identitySession, signIn, signOut, refreshSession, grantConsent, revokeConsent],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

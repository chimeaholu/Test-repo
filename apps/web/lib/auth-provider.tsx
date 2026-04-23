"use client";

import type { IdentitySession } from "@agrodomain/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api-client";
import { ApiRequestError } from "@/lib/api-types";
import {
  AuthContext,
  type AuthContextValue,
  type AuthSessionState,
  type SignInData,
  type UnauthenticatedState,
  UNAUTHENTICATED,
  clearSessionFromStorage,
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
        }
      } catch (err) {
        // Token expired or invalid — clear everything
        if (!cancelled) {
          clearSessionFromStorage();
          setSessionState(UNAUTHENTICATED);
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
  }, []);

  // -----------------------------------------------------------------------
  // signOut
  // -----------------------------------------------------------------------

  const signOut = useCallback(() => {
    clearSessionFromStorage();
    setSessionState(UNAUTHENTICATED);
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
    } catch {
      clearSessionFromStorage();
      setSessionState(UNAUTHENTICATED);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Memoised context value
  // -----------------------------------------------------------------------

  const value = useMemo<AuthContextValue>(
    () => ({
      ...sessionState,
      isReady,
      signIn,
      signOut,
      refreshSession,
    }),
    [sessionState, isReady, signIn, signOut, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

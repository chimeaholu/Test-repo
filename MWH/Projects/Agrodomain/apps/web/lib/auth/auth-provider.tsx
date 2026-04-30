"use client";

import type { IdentitySession } from "@agrodomain/contracts";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createTraceId } from "@/features/shell/model";
import { identityApi } from "@/lib/api/identity";
import { AUTH_STATE_EVENT } from "@/lib/api-client";
import { recordTelemetry } from "@/lib/telemetry/client";
import {
  AuthContext,
  type AuthContextValue,
  type MagicLinkChallenge,
  type MagicLinkInput,
  type MagicLinkVerifyInput,
  type PasswordSignInInput,
  type SignInInput,
  type SignInOptions,
} from "./auth-context";

/** Lightweight cookie so Next.js middleware can gate protected routes. */
function syncSessionCookie(hasSession: boolean): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? ";secure" : "";
  if (hasSession) {
    document.cookie = `agrodomain-session=1;path=/;samesite=lax${secure}`;
  } else {
    document.cookie = `agrodomain-session=;path=/;max-age=0;samesite=lax${secure}`;
  }
}

function normalizeRedirectTarget(redirectTo?: string | null): string | null {
  if (!redirectTo || !redirectTo.startsWith("/app") || redirectTo.startsWith("//")) {
    return null;
  }
  return redirectTo;
}

function authErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function AuthProvider({
  children,
  onSessionChange,
}: {
  children: ReactNode;
  onSessionChange?: (session: IdentitySession | null) => void;
}) {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [session, setSession] = useState<IdentitySession | null>(null);

  const applyStoredSession = useCallback(() => {
    const traceId = createTraceId("auth-sync");
    const stored = identityApi.getStoredSession(traceId).data;
    setSession(stored);
    syncSessionCookie(Boolean(stored));
    onSessionChange?.(stored);
  }, [onSessionChange]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromEvent = () => applyStoredSession();
    const syncFromStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === "agrodomain.session.v2" ||
        event.key === "agrodomain.session-token.v1"
      ) {
        applyStoredSession();
      }
    };

    window.addEventListener(AUTH_STATE_EVENT, syncFromEvent);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener(AUTH_STATE_EVENT, syncFromEvent);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [applyStoredSession]);

  useEffect(() => {
    const traceId = createTraceId("auth-boot");
    const bootToken = identityApi.getStoredAccessToken();

    void identityApi
      .restoreSession(traceId)
      .then((response) => {
        if (identityApi.getStoredAccessToken() !== bootToken) return;
        setSession(response.data);
        syncSessionCookie(Boolean(response.data));
        onSessionChange?.(response.data);
        recordTelemetry({
          event: "auth_session_restored",
          trace_id: traceId,
          timestamp: new Date().toISOString(),
          detail: { has_session: Boolean(response.data) },
        });
      })
      .finally(() => setIsHydrated(true));
  }, [onSessionChange]);

  const pushAfterSignIn = useCallback(
    (options?: SignInOptions) => {
      const nextTarget = normalizeRedirectTarget(options?.redirectTo);
      router.push(
        nextTarget
          ? `/onboarding/consent?next=${encodeURIComponent(nextTarget)}`
          : "/onboarding/consent",
      );
    },
    [router],
  );

  const signIn = useCallback(
    async (input: SignInInput, options?: SignInOptions) => {
      const traceId = createTraceId("preview-sign-in");
      setIsSigningIn(true);
      setSignInError(null);
      try {
        const response = (
          await identityApi.signInPreview(
            {
              country_code: input.countryCode,
              display_name: input.displayName,
              email: input.email,
              role: input.role,
            },
            traceId,
          )
        ).data;
        setSession(response);
        syncSessionCookie(true);
        onSessionChange?.(response);
        pushAfterSignIn(options);
      } catch (error) {
        const message = authErrorMessage(error, "Preview access failed. Please try again.");
        setSignInError(message);
        throw error;
      } finally {
        setIsSigningIn(false);
      }
    },
    [onSessionChange, pushAfterSignIn],
  );

  const signInWithPassword = useCallback(
    async (input: PasswordSignInInput, options?: SignInOptions) => {
      const traceId = createTraceId("password-sign-in");
      setIsSigningIn(true);
      setSignInError(null);
      try {
        const response = (await identityApi.signInWithPassword(input, traceId)).data;
        setSession(response);
        syncSessionCookie(true);
        onSessionChange?.(response);
        pushAfterSignIn(options);
      } catch (error) {
        const message = authErrorMessage(error, "Password sign-in failed. Please try again.");
        setSignInError(message);
        throw error;
      } finally {
        setIsSigningIn(false);
      }
    },
    [onSessionChange, pushAfterSignIn],
  );

  const requestMagicLink = useCallback(async (input: MagicLinkInput): Promise<MagicLinkChallenge> => {
    const traceId = createTraceId("magic-link");
    setIsSigningIn(true);
    setSignInError(null);
    try {
      return (await identityApi.requestMagicLink(input, traceId)).data;
    } catch (error) {
      const message = authErrorMessage(error, "Magic-link request failed. Please try again.");
      setSignInError(message);
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const verifyMagicLink = useCallback(
    async (input: MagicLinkVerifyInput, options?: SignInOptions) => {
      const traceId = createTraceId("magic-link-verify");
      setIsSigningIn(true);
      setSignInError(null);
      try {
        const response = (await identityApi.verifyMagicLink(input, traceId)).data;
        setSession(response);
        syncSessionCookie(true);
        onSessionChange?.(response);
        pushAfterSignIn(options);
      } catch (error) {
        const message = authErrorMessage(error, "Magic-link verification failed. Please try again.");
        setSignInError(message);
        throw error;
      } finally {
        setIsSigningIn(false);
      }
    },
    [onSessionChange, pushAfterSignIn],
  );

  const clearSession = useCallback(() => {
    const traceId = createTraceId("sign-out");
    void identityApi.logout(traceId).finally(() => {
      identityApi.clear();
      setSession(null);
      setSignInError(null);
      syncSessionCookie(false);
      onSessionChange?.(null);
      router.push("/signin");
    });
  }, [onSessionChange, router]);

  const updateSession = useCallback(
    (newSession: IdentitySession | null) => {
      setSession(newSession);
      syncSessionCookie(Boolean(newSession));
      onSessionChange?.(newSession);
    },
    [onSessionChange],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrated,
      isSigningIn,
      signInError,
      session,
      signIn,
      signInWithPassword,
      requestMagicLink,
      verifyMagicLink,
      clearSession,
      updateSession,
    }),
    [
      clearSession,
      isHydrated,
      isSigningIn,
      requestMagicLink,
      session,
      signIn,
      signInError,
      signInWithPassword,
      verifyMagicLink,
      updateSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

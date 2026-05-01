"use client";

import type { IdentitySession } from "@agrodomain/contracts";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { identityApi } from "@/lib/api/identity";
import { createTraceId } from "@/features/shell/model";
import { recordTelemetry } from "@/lib/telemetry/client";
import { AuthContext, type AuthContextValue, type SignInInput } from "./auth-context";

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

function readStoredSessionSnapshot(): IdentitySession | null {
  return identityApi.getStoredSession(createTraceId("auth-storage-sync")).data;
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storage = window.localStorage;
    const storagePrototype = Object.getPrototypeOf(storage) as Storage;
    const originalPrototypeSetItem = storagePrototype.setItem;
    const originalPrototypeRemoveItem = storagePrototype.removeItem;
    const originalPrototypeClear = storagePrototype.clear;
    const originalInstanceSetItem = storage.setItem.bind(storage);
    const originalInstanceRemoveItem = storage.removeItem.bind(storage);
    const originalInstanceClear = storage.clear.bind(storage);

    const applyStoredSession = () => {
      const stored = readStoredSessionSnapshot();
      setSession(stored);
      syncSessionCookie(Boolean(stored));
      onSessionChange?.(stored);
    };

    const patchedSetItem = function patchedSetItem(this: Storage, key: string, value: string) {
      originalPrototypeSetItem.call(this, key, value);
      if (key === "agrodomain.session.v2" || key === "agrodomain.session-token.v1") {
        applyStoredSession();
      }
    };
    const patchedRemoveItem = function patchedRemoveItem(this: Storage, key: string) {
      originalPrototypeRemoveItem.call(this, key);
      if (key === "agrodomain.session.v2" || key === "agrodomain.session-token.v1") {
        applyStoredSession();
      }
    };
    const patchedClear = function patchedClear(this: Storage) {
      originalPrototypeClear.call(this);
      applyStoredSession();
    };

    storagePrototype.setItem = patchedSetItem;
    storagePrototype.removeItem = patchedRemoveItem;
    storagePrototype.clear = patchedClear;

    Object.defineProperty(storage, "setItem", {
      configurable: true,
      value(key: string, value: string) {
        originalInstanceSetItem(key, value);
        if (key === "agrodomain.session.v2" || key === "agrodomain.session-token.v1") {
          applyStoredSession();
        }
      },
    });
    Object.defineProperty(storage, "removeItem", {
      configurable: true,
      value(key: string) {
        originalInstanceRemoveItem(key);
        if (key === "agrodomain.session.v2" || key === "agrodomain.session-token.v1") {
          applyStoredSession();
        }
      },
    });
    Object.defineProperty(storage, "clear", {
      configurable: true,
      value() {
        originalInstanceClear();
        applyStoredSession();
      },
    });

    return () => {
      storagePrototype.setItem = originalPrototypeSetItem;
      storagePrototype.removeItem = originalPrototypeRemoveItem;
      storagePrototype.clear = originalPrototypeClear;
      Object.defineProperty(storage, "setItem", {
        configurable: true,
        value: originalInstanceSetItem,
      });
      Object.defineProperty(storage, "removeItem", {
        configurable: true,
        value: originalInstanceRemoveItem,
      });
      Object.defineProperty(storage, "clear", {
        configurable: true,
        value: originalInstanceClear,
      });
    };
  }, [onSessionChange]);

  // Restore session on mount
  useEffect(() => {
    const traceId = createTraceId("auth-boot");
    const bootToken = identityApi.getStoredAccessToken();
    const stored = identityApi.getStoredSession(traceId).data;
    setSession(stored);
    syncSessionCookie(Boolean(stored));

    void identityApi
      .restoreSession(traceId)
      .then((response) => {
        // Guard against stale resolution if another sign-in happened meanwhile.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(
    async (input: SignInInput) => {
      const traceId = createTraceId("sign-in");
      setIsSigningIn(true);
      setSignInError(null);
      try {
        const response = (
          await identityApi.signIn(
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
        router.push("/onboarding/consent");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Sign-in failed. Please try again.";
        setSignInError(message);
        throw err;
      } finally {
        setIsSigningIn(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router],
  );

  const clearSession = useCallback(() => {
    identityApi.clear();
    setSession(null);
    setSignInError(null);
    syncSessionCookie(false);
    onSessionChange?.(null);
    router.push("/signin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const updateSession = useCallback(
    (newSession: IdentitySession | null) => {
      setSession(newSession);
      syncSessionCookie(Boolean(newSession));
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrated,
      isSigningIn,
      signInError,
      session,
      signIn,
      clearSession,
      updateSession,
    }),
    [isHydrated, isSigningIn, signInError, session, signIn, clearSession, updateSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

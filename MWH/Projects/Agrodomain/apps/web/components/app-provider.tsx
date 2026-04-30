"use client";

import type {
  ConnectivityState,
  IdentitySession,
  OfflineQueueSnapshot,
} from "@agrodomain/contracts";
import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { apiBaseUrl, readToken, writeSession } from "@/lib/api-client";
import { identityApi } from "@/lib/api/identity";
import { AuthProvider } from "@/lib/auth/auth-provider";
import type { PreviewRole } from "@/lib/auth/auth-context";
import { useAuth } from "@/lib/auth/auth-context";
import { listCachedReadModels, type CachedReadModelSummary } from "@/lib/offline/cache";
import { replayQueuedMutations } from "@/lib/offline/mutation-engine";
import { reduceQueueSnapshot } from "@/lib/offline/reducer";
import { OFFLINE_STATE_EVENT } from "@/lib/offline/storage";
import { recordTelemetry } from "@/lib/telemetry/client";
import { createTraceId, getRouteDecision, homeRouteForRole } from "@/features/shell/model";

// Re-export for consumers who only need auth
export { useAuth } from "@/lib/auth/auth-context";

interface AppContextValue {
  cachedReadModels: CachedReadModelSummary[];
  isHydrated: boolean;
  session: IdentitySession | null;
  queue: OfflineQueueSnapshot;
  traceId: string;
  signIn: (input: {
    method: "preview";
    displayName: string;
    email: string;
    role: PreviewRole;
    countryCode: string;
    redirectTo?: string | null;
  }) => Promise<void>;
  signInWithPassword: (input: {
    identifier: string;
    password: string;
    countryCode: string;
    redirectTo?: string | null;
  }) => Promise<void>;
  requestMagicLink: (input: {
    identifier: string;
    countryCode: string;
  }) => Promise<{
    challengeId: string;
    deliveryChannel: "sms" | "email";
    provider: string;
    fallbackProvider: string | null;
    maskedTarget: string;
    expiresAt: string;
    previewCode: string | null;
  }>;
  verifyMagicLink: (input: {
    challengeId: string;
    verificationCode: string;
    redirectTo?: string | null;
  }) => Promise<void>;
  ensureConsentPending: () => void;
  grantConsent: (input: { policyVersion: string; scopeIds: string[] }) => Promise<void>;
  revokeConsent: (reason: string) => Promise<void>;
  retryQueueItem: (itemId: string) => void;
  dismissQueueItem: (itemId: string) => void;
  setConnectivityState: (state: ConnectivityState) => void;
  clearSession: () => void;
  updateSession: (session: IdentitySession | null) => void;
}

const defaultQueue: OfflineQueueSnapshot = {
  connectivity_state: "online",
  handoff_channel: null,
  items: [],
};

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Inner provider that consumes AuthProvider context and layers
 * queue management, consent lifecycle, telemetry, and route guards.
 */
function AppProviderInner({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [traceId, setTraceId] = useState(createTraceId("boot"));
  const [queue, setQueue] = useState<OfflineQueueSnapshot>(defaultQueue);
  const [cachedReadModels, setCachedReadModels] = useState<CachedReadModelSummary[]>([]);
  const isReplayingRef = useRef(false);
  const previousConnectivityRef = useRef<ConnectivityState | null>(null);

  // Sync queue from localStorage once auth hydration completes
  useEffect(() => {
    if (auth.isHydrated) {
      const bootTrace = createTraceId("boot");
      const bootQueue = identityApi.getQueue(bootTrace).data;
      setQueue(bootQueue);
      setCachedReadModels(listCachedReadModels(bootQueue.connectivity_state));
      recordTelemetry({
        event: "shell_boot",
        trace_id: bootTrace,
        timestamp: new Date().toISOString(),
        detail: {
          has_session: Boolean(auth.session),
          queue_depth: bootQueue.items.length,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isHydrated]);

  // Trace per route change
  useEffect(() => {
    const routeTrace = createTraceId(pathname ?? "route");
    setTraceId(routeTrace);
    recordTelemetry({
      event: "route_change",
      trace_id: routeTrace,
      timestamp: new Date().toISOString(),
      detail: { route: pathname ?? "/" },
    });
  }, [pathname]);

  useEffect(() => {
    if (!auth.isHydrated) return;

    const syncOfflineState = () => {
      const snapshot = identityApi.getQueue(traceId).data;
      setQueue(snapshot);
      setCachedReadModels(listCachedReadModels(snapshot.connectivity_state));
    };

    window.addEventListener(OFFLINE_STATE_EVENT, syncOfflineState);
    return () => {
      window.removeEventListener(OFFLINE_STATE_EVENT, syncOfflineState);
    };
  }, [auth.isHydrated, traceId]);

  // Online/offline listeners
  useEffect(() => {
    if (!auth.isHydrated) return;

    const onlineHandler = () => {
      setQueue((current) => {
        const next = reduceQueueSnapshot(current, {
          type: "set_connectivity",
          connectivityState: "online",
        });
        identityApi.storeQueue(next);
        setCachedReadModels(listCachedReadModels(next.connectivity_state));
        return next;
      });
    };

    const offlineHandler = () => {
      setQueue((current) => {
        const next = reduceQueueSnapshot(current, {
          type: "set_connectivity",
          connectivityState: "offline",
        });
        identityApi.storeQueue(next);
        setCachedReadModels(listCachedReadModels(next.connectivity_state));
        return next;
      });
    };

    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, [auth.isHydrated]);

  useEffect(() => {
    if (!auth.isHydrated || !auth.session) return;
    if (queue.connectivity_state !== "online") {
      previousConnectivityRef.current = queue.connectivity_state;
      return;
    }

    const actionable = queue.items.some((item) =>
      ["queued", "failed_retryable", "replaying"].includes(item.state),
    );
    const previousConnectivity = previousConnectivityRef.current;
    previousConnectivityRef.current = queue.connectivity_state;

    if (!actionable || isReplayingRef.current) {
      return;
    }

    if (previousConnectivity === "online") {
      return;
    }

    isReplayingRef.current = true;
    void replayQueuedMutations({
      accessToken: readToken(),
      apiBaseUrl: apiBaseUrl(),
      snapshot: queue,
    })
      .then((nextQueue) => {
        setQueue(nextQueue);
        setCachedReadModels(listCachedReadModels(nextQueue.connectivity_state));
        recordTelemetry({
          event: "queue_replay_completed",
          trace_id: traceId,
          timestamp: new Date().toISOString(),
          detail: {
            queue_depth: nextQueue.items.length,
          },
        });
      })
      .finally(() => {
        isReplayingRef.current = false;
      });
  }, [auth.isHydrated, auth.session, queue, traceId]);

  // Client-side route guard
  useEffect(() => {
    if (!auth.isHydrated) return;
    const decision = getRouteDecision(pathname ?? "/", auth.session);
    if (!decision.allowed && decision.redirectTo && pathname !== decision.redirectTo) {
      router.replace(decision.redirectTo);
    }
  }, [auth.isHydrated, pathname, router, auth.session]);

  const value = useMemo<AppContextValue>(
    () => ({
      cachedReadModels,
      clearSession() {
        auth.clearSession();
        setQueue(defaultQueue);
        setCachedReadModels([]);
      },
      dismissQueueItem(itemId) {
        setQueue((current) => {
          const next = reduceQueueSnapshot(current, { type: "dismiss_item", itemId });
          identityApi.storeQueue(next);
          setCachedReadModels(listCachedReadModels(next.connectivity_state));
          recordTelemetry({
            event: "queue_item_dismissed",
            trace_id: traceId,
            timestamp: new Date().toISOString(),
            detail: { item_id: itemId, queue_depth: next.items.length },
          });
          return next;
        });
      },
      ensureConsentPending() {
        const response = identityApi.markConsentPending(traceId).data;
        auth.updateSession(response);
      },
      async grantConsent(input) {
        const response = (
          await identityApi.captureConsent(
            {
              captured_at: new Date().toISOString(),
              policy_version: input.policyVersion,
              scope_ids: input.scopeIds,
            },
            traceId,
          )
        ).data;
        auth.updateSession(response);
        recordTelemetry({
          event: "onboarding_funnel_completed",
          trace_id: traceId,
          timestamp: new Date().toISOString(),
          detail: { scope_count: input.scopeIds.length },
        });
        if (response) {
          const nextTarget = searchParams.get("next");
          const safeRedirect =
            nextTarget && nextTarget.startsWith("/app") && !nextTarget.startsWith("//")
              ? nextTarget
              : null;
          router.push(safeRedirect ?? homeRouteForRole(response.actor.role));
        }
      },
      isHydrated: auth.isHydrated,
      queue,
      retryQueueItem(itemId) {
        setQueue((current) => {
          const next: OfflineQueueSnapshot =
            current.connectivity_state === "online"
              ? {
                  ...current,
                  items: current.items.map((item) =>
                    item.item_id === itemId
                      ? { ...item, state: "replaying" as const }
                      : item,
                  ),
                }
              : reduceQueueSnapshot(current, { type: "retry_item", itemId });
          identityApi.storeQueue(next);
          setCachedReadModels(listCachedReadModels(next.connectivity_state));
          if (next.connectivity_state === "online") {
            void replayQueuedMutations({
              accessToken: readToken(),
              apiBaseUrl: apiBaseUrl(),
              snapshot: next,
            }).then((replayedQueue) => {
              setQueue(replayedQueue);
              setCachedReadModels(listCachedReadModels(replayedQueue.connectivity_state));
            });
          }
          recordTelemetry({
            event: "queue_replay_requested",
            trace_id: traceId,
            timestamp: new Date().toISOString(),
            detail: { item_id: itemId, queue_depth: next.items.length },
          });
          return next;
        });
      },
      async revokeConsent(reason) {
        const response = (await identityApi.revokeConsent(reason, traceId)).data;
        auth.updateSession(response);
        setQueue(identityApi.getQueue(traceId).data);
      },
      session: auth.session,
      updateSession(nextSession) {
        writeSession(nextSession);
        auth.updateSession(nextSession);
      },
      setConnectivityState(state) {
        setQueue((current) => {
          const next = reduceQueueSnapshot(current, {
            type: "set_connectivity",
            connectivityState: state,
          });
          identityApi.storeQueue(next);
          setCachedReadModels(listCachedReadModels(next.connectivity_state));
          recordTelemetry({
            event: "channel_handoff_prompted",
            trace_id: traceId,
            timestamp: new Date().toISOString(),
            detail: {
              connectivity_state: state,
              queue_depth: next.items.length,
            },
          });
          return next;
        });
      },
      async signIn(input) {
        await auth.signIn(input, { redirectTo: input.redirectTo });
        const nextQueue = identityApi.getQueue(traceId).data;
        setQueue(nextQueue);
        setCachedReadModels(listCachedReadModels(nextQueue.connectivity_state));
      },
      async signInWithPassword(input) {
        await auth.signInWithPassword(
          {
            identifier: input.identifier,
            password: input.password,
            countryCode: input.countryCode,
          },
          { redirectTo: input.redirectTo },
        );
        const nextQueue = identityApi.getQueue(traceId).data;
        setQueue(nextQueue);
        setCachedReadModels(listCachedReadModels(nextQueue.connectivity_state));
      },
      async requestMagicLink(input) {
        return auth.requestMagicLink(input);
      },
      async verifyMagicLink(input) {
        await auth.verifyMagicLink(
          {
            challengeId: input.challengeId,
            verificationCode: input.verificationCode,
          },
          { redirectTo: input.redirectTo },
        );
        const nextQueue = identityApi.getQueue(traceId).data;
        setQueue(nextQueue);
        setCachedReadModels(listCachedReadModels(nextQueue.connectivity_state));
      },
      traceId,
    }),
    [auth, cachedReadModels, queue, router, searchParams, traceId],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Root application provider. Composes AuthProvider (session/auth) with
 * queue management, consent lifecycle, telemetry, and route guards.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppProviderInner>{children}</AppProviderInner>
    </AuthProvider>
  );
}

export function useAppState(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppProvider");
  }
  return context;
}

"use client";

import type {
  ActorRole,
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
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { writeSession } from "@/lib/api-client";
import { identityApi } from "@/lib/api/identity";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { useAuth } from "@/lib/auth/auth-context";
import { reduceQueueSnapshot } from "@/lib/offline/reducer";
import { recordTelemetry } from "@/lib/telemetry/client";
import { createTraceId, getRouteDecision, homeRouteForRole } from "@/features/shell/model";

// Re-export for consumers who only need auth
export { useAuth } from "@/lib/auth/auth-context";

interface AppContextValue {
  isHydrated: boolean;
  session: IdentitySession | null;
  queue: OfflineQueueSnapshot;
  traceId: string;
  signIn: (input: {
    displayName: string;
    email: string;
    role: ActorRole;
    countryCode: string;
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
  const [traceId, setTraceId] = useState(createTraceId("boot"));
  const [queue, setQueue] = useState<OfflineQueueSnapshot>(defaultQueue);

  // Sync queue from localStorage once auth hydration completes
  useEffect(() => {
    if (auth.isHydrated) {
      const bootTrace = createTraceId("boot");
      setQueue(identityApi.getQueue(bootTrace).data);
      recordTelemetry({
        event: "shell_boot",
        trace_id: bootTrace,
        timestamp: new Date().toISOString(),
        detail: {
          has_session: Boolean(auth.session),
          queue_depth: identityApi.getQueue(bootTrace).data.items.length,
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
      clearSession() {
        auth.clearSession();
        setQueue(defaultQueue);
      },
      dismissQueueItem(itemId) {
        setQueue((current) => {
          const next = reduceQueueSnapshot(current, { type: "dismiss_item", itemId });
          identityApi.storeQueue(next);
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
          router.push(homeRouteForRole(response.actor.role));
        }
      },
      isHydrated: auth.isHydrated,
      queue,
      retryQueueItem(itemId) {
        setQueue((current) => {
          let next = reduceQueueSnapshot(current, { type: "retry_item", itemId });
          next = reduceQueueSnapshot(next, {
            type: "ack_item",
            itemId,
            resultRef: `result-${itemId}`,
          });
          identityApi.storeQueue(next);
          recordTelemetry({
            event: "queue_replay_acked",
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
        await auth.signIn(input);
        setQueue(identityApi.getQueue(traceId).data);
      },
      traceId,
    }),
    [auth, queue, router, traceId],
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

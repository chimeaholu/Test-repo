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

import { agroApiClient } from "@/lib/api/mock-client";
import { deriveHandoffChannel } from "@/lib/runtime-config";
import { reduceQueueSnapshot } from "@/lib/offline/reducer";
import { recordTelemetry } from "@/lib/telemetry/client";
import { createTraceId, getRouteDecision, homeRouteForRole } from "@/features/shell/model";

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
}

const defaultQueue: OfflineQueueSnapshot = {
  connectivity_state: "online",
  handoff_channel: null,
  items: [],
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [traceId, setTraceId] = useState(createTraceId("boot"));
  const [session, setSession] = useState<IdentitySession | null>(null);
  const [queue, setQueue] = useState<OfflineQueueSnapshot>(defaultQueue);

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
    const routeTrace = createTraceId("boot");
    const bootToken = agroApiClient.getStoredAccessToken();
    const storedSession = agroApiClient.getStoredSession(routeTrace).data;
    setSession(storedSession);
    setQueue(agroApiClient.getQueue(routeTrace).data);
    setIsHydrated(true);

    void agroApiClient.restoreSession(routeTrace).then((response) => {
      if (agroApiClient.getStoredAccessToken() !== bootToken) {
        return;
      }
      setSession(response.data);
      setQueue(agroApiClient.getQueue(routeTrace).data);
      recordTelemetry({
        event: "shell_boot",
        trace_id: routeTrace,
        timestamp: new Date().toISOString(),
        detail: {
          has_session: Boolean(response.data ?? storedSession),
          queue_depth: agroApiClient.getQueue(routeTrace).data.items.length,
        },
      });
    });
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const onlineHandler = () => {
      setQueue((current) => {
        const next = reduceQueueSnapshot(current, {
          type: "set_connectivity",
          connectivityState: "online",
        });
        next.handoff_channel =
          session == null
            ? next.handoff_channel
            : deriveHandoffChannel({
                connectivityState: "online",
                countryCode: session.actor.country_code,
                environment: "local",
              });
        agroApiClient.storeQueue(next);
        return next;
      });
    };

    const offlineHandler = () => {
      setQueue((current) => {
        const next = reduceQueueSnapshot(current, {
          type: "set_connectivity",
          connectivityState: "offline",
        });
        next.handoff_channel =
          session == null
            ? next.handoff_channel
            : deriveHandoffChannel({
                connectivityState: "offline",
                countryCode: session.actor.country_code,
                environment: "local",
              });
        agroApiClient.storeQueue(next);
        return next;
      });
    };

    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, [isHydrated, session]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    const decision = getRouteDecision(pathname ?? "/", session);
    if (!decision.allowed && decision.redirectTo && pathname !== decision.redirectTo) {
      router.replace(decision.redirectTo);
    }
  }, [isHydrated, pathname, router, session]);

  const value = useMemo<AppContextValue>(
    () => ({
      clearSession() {
        agroApiClient.clear();
        setSession(null);
        setQueue(defaultQueue);
        router.push("/signin");
      },
      dismissQueueItem(itemId) {
        setQueue((current) => {
          const next = reduceQueueSnapshot(current, { type: "dismiss_item", itemId });
          agroApiClient.storeQueue(next);
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
        const response = agroApiClient.markConsentPending(traceId).data;
        setSession(response);
      },
      async grantConsent(input) {
        const response = (
          await agroApiClient.captureConsent(
          {
            captured_at: new Date().toISOString(),
            policy_version: input.policyVersion,
            scope_ids: input.scopeIds,
          },
          traceId,
        )
        ).data;
        setSession(response);
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
      isHydrated,
      queue,
      retryQueueItem(itemId) {
        setQueue((current) => {
          const next = reduceQueueSnapshot(current, { type: "retry_item", itemId });
          agroApiClient.storeQueue(next);
          return next;
        });
        const queueItem = agroApiClient.getQueue(traceId).data.items.find((item) => item.item_id === itemId);
        if (!queueItem) {
          return;
        }
        void agroApiClient
          .replayOfflineQueueItem(queueItem, session?.actor.role ?? "farmer", traceId)
          .then((response) => {
            setQueue((current) => {
              const next = reduceQueueSnapshot(current, {
                type: "apply_backend_result",
                itemId,
                errorCode: response.data.error_code,
                resultRef: response.data.result_ref,
                retryable: response.data.retryable,
              });
              agroApiClient.storeQueue(next);
              recordTelemetry({
                event: response.data.result_ref ? "queue_replay_acked" : "queue_replay_failed",
                trace_id: traceId,
                timestamp: new Date().toISOString(),
                detail: {
                  item_id: itemId,
                  queue_depth: next.items.length,
                  replayed: response.data.replayed,
                },
              });
              return next;
            });
          })
          .catch((error: Error) => {
            setQueue((current) => {
              const next = reduceQueueSnapshot(current, {
                type: "apply_backend_result",
                itemId,
                errorCode: error.message,
                retryable: true,
              });
              agroApiClient.storeQueue(next);
              return next;
            });
          });
      },
      async revokeConsent(reason) {
        const response = (await agroApiClient.revokeConsent(reason, traceId)).data;
        setSession(response);
        setQueue(agroApiClient.getQueue(traceId).data);
      },
      session,
      setConnectivityState(state) {
        setQueue((current) => {
          const next = reduceQueueSnapshot(current, {
            type: "set_connectivity",
            connectivityState: state,
          });
          next.handoff_channel =
            session == null
              ? next.handoff_channel
              : deriveHandoffChannel({
                  connectivityState: state,
                  countryCode: session.actor.country_code,
                  environment: "local",
                });
          agroApiClient.storeQueue(next);
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
        const response = (
          await agroApiClient.signIn(
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
        setQueue(agroApiClient.getQueue(traceId).data);
        router.push("/onboarding/consent");
      },
      traceId,
    }),
    [isHydrated, queue, router, session, traceId],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppProvider");
  }
  return context;
}

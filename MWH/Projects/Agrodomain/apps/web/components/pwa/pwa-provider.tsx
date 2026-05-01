"use client";

import { useEffect } from "react";

import { registerAppServiceWorker } from "@/lib/pwa/service-worker";
import { recordTelemetry } from "@/lib/telemetry/client";
import { createTraceId } from "@/features/shell/model";

export function PwaProvider() {
  useEffect(() => {
    let cancelled = false;

    void registerAppServiceWorker()
      .then((registration) => {
        if (!registration || cancelled) {
          return;
        }

        recordTelemetry({
          event: "pwa_service_worker_registered",
          trace_id: createTraceId("pwa-ready"),
          timestamp: new Date().toISOString(),
          detail: { scope: "/" },
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        recordTelemetry({
          event: "pwa_service_worker_failed",
          trace_id: createTraceId("pwa-failed"),
          timestamp: new Date().toISOString(),
          detail: {
            message: error instanceof Error ? error.message : "unknown_error",
          },
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

import { PWA_SW_PATH } from "@/lib/pwa/config";

export interface ServiceWorkerRegistrar {
  register: (
    url: string,
    options: { scope: string; updateViaCache: "none" },
  ) => Promise<unknown>;
}

export function canRegisterServiceWorker(
  environment = process.env.NODE_ENV,
  hasWindow = typeof window !== "undefined",
  registrar: ServiceWorkerRegistrar | null | undefined =
    typeof navigator === "undefined" ? undefined : navigator.serviceWorker,
): registrar is ServiceWorkerRegistrar {
  return environment === "production" && hasWindow && Boolean(registrar);
}

export function registerAppServiceWorker(
  registrar: ServiceWorkerRegistrar | null | undefined =
    typeof navigator === "undefined" ? undefined : navigator.serviceWorker,
  environment = process.env.NODE_ENV,
  hasWindow = typeof window !== "undefined",
): Promise<unknown | null> {
  if (!canRegisterServiceWorker(environment, hasWindow, registrar)) {
    return Promise.resolve(null);
  }

  return registrar.register(PWA_SW_PATH, {
    scope: "/",
    updateViaCache: "none",
  });
}

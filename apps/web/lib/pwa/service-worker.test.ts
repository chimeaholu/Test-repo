import { describe, expect, it, vi } from "vitest";

import {
  canRegisterServiceWorker,
  registerAppServiceWorker,
  type ServiceWorkerRegistrar,
} from "@/lib/pwa/service-worker";

describe("service worker registration helpers", () => {
  it("only enables registration in production with a browser registrar", () => {
    const registrar: ServiceWorkerRegistrar = {
      register: vi.fn(),
    };

    expect(canRegisterServiceWorker("production", true, registrar)).toBe(true);
    expect(canRegisterServiceWorker("development", true, registrar)).toBe(false);
    expect(canRegisterServiceWorker("production", false, registrar)).toBe(false);
    expect(canRegisterServiceWorker("production", true, null)).toBe(false);
  });

  it("registers the app service worker with the expected scope", async () => {
    const registrar: ServiceWorkerRegistrar = {
      register: vi.fn().mockResolvedValue({ scope: "/" }),
    };

    const result = await registerAppServiceWorker(registrar, "production", true);

    expect(registrar.register).toHaveBeenCalledWith("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    expect(result).toEqual({ scope: "/" });
  });

  it("returns null when the environment should not register", async () => {
    const registrar: ServiceWorkerRegistrar = {
      register: vi.fn(),
    };

    await expect(
      registerAppServiceWorker(registrar, "test", true),
    ).resolves.toBeNull();
    expect(registrar.register).not.toHaveBeenCalled();
  });
});

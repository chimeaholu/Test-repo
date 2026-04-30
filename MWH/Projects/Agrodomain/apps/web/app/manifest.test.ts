import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

describe("web app manifest", () => {
  it("exposes an installable standalone configuration", () => {
    const output = manifest();

    expect(output.name).toBe("Agrodomain");
    expect(output.start_url).toBe("/signin?source=pwa");
    expect(output.display).toBe("standalone");
    expect(output.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icon-192.png", sizes: "192x192" }),
        expect.objectContaining({ src: "/icon-512.png", sizes: "512x512" }),
      ]),
    );
  });
});

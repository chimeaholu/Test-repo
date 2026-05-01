import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { roleNavigation } from "@/components/layout/nav-items";
import { ROLE_EXPERIENCE } from "@/features/shell/content";

const globalsCss = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const publicPagesCss = readFileSync(resolve(process.cwd(), "app/public-pages.css"), "utf8");
const designSystemCss = readFileSync(resolve(process.cwd(), "app/design-system.css"), "utf8");

function wordCount(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

describe("EH1 UX harness", () => {
  it("keeps navigation labels short and icon-first friendly", () => {
    for (const sections of Object.values(roleNavigation)) {
      for (const item of sections.flatMap((section) => section.items)) {
        expect(wordCount(item.label), `${item.id} label is too long for quick scanning`).toBeLessThanOrEqual(2);
        if (item.mobileLabel) {
          expect(wordCount(item.mobileLabel), `${item.id} mobile label is too long`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("keeps role-home action labels short and limited", () => {
    for (const experience of Object.values(ROLE_EXPERIENCE)) {
      expect(wordCount(experience.dominantActionLabel), `${experience.eyebrow} dominant action is too long`).toBeLessThanOrEqual(3);
      expect(experience.tasks.length, `${experience.eyebrow} exposes too many secondary actions`).toBeLessThanOrEqual(2);

      for (const task of experience.tasks) {
        expect(wordCount(task.label), `${task.label} should scan in two words or fewer`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("keeps touch-target and action-tile minimums encoded in CSS", () => {
    expect(globalsCss).toContain(".button-primary");
    expect(globalsCss).toContain("min-height: 48px;");
    expect(globalsCss).toContain(".task-card {\n  min-height: 112px;");
    expect(designSystemCss).toContain(".ds-sidebar-link");
    expect(designSystemCss).toContain(".ds-topbar-link");
    expect(designSystemCss).toContain(".ds-topbar-profile");
    expect(designSystemCss).toContain(".ds-bottom-nav-item");
  });

  it("keeps authentic imagery wired into public and authenticated surfaces", () => {
    expect(globalsCss).toContain("--photo-hero: url(\"/brand/agrodomain-cover.jpg\")");
    expect(globalsCss).toContain("--photo-detail: url(\"/brand/agrodomain-article.png\")");
    expect(publicPagesCss).toContain("var(--photo-hero)");
    expect(publicPagesCss).toContain("var(--photo-detail)");
    expect(designSystemCss).toContain("var(--photo-detail)");
    expect(designSystemCss).toContain("var(--photo-hero)");
  });
});

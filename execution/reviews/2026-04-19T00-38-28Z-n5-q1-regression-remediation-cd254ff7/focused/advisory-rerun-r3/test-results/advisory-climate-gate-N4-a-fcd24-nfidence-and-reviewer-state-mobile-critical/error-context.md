# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: advisory-climate-gate.spec.ts >> N4 advisory and climate tranche diagnostics >> CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state
- Location: tests/e2e/advisory-climate-gate.spec.ts:57:7

# Error details

```
Error: page.screenshot: Target crashed 
Browser logs:

<launching> /home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,BoundaryEventDispatchTracksNodeRemoval,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate,AutoDeElevate,RenderDocument,OptimizationHints --enable-features=CDPScreenshotNewSurface --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --edge-skip-compat-layer-relaunch --enable-automation --disable-infobars --disable-search-engine-choice-screen --disable-sync --enable-unsafe-swiftshader --headless --hide-scrollbars --mute-audio --blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4 --no-sandbox --user-data-dir=/tmp/playwright_chromiumdev_profile-H3EoSR --remote-debugging-pipe --no-startup-window
<launched> pid=456557
[pid=456557][err] [0419/005107.381366:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=456557][err] [0419/005107.384443:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=456557][err] [0419/005107.384513:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=456557][err] [0419/005107.402682:WARNING:device/bluetooth/dbus/bluez_dbus_manager.cc:209] Floss manager service not available, cannot set Floss enable/disable.
[pid=456557][err] [0419/005107.507533:WARNING:sandbox/policy/linux/sandbox_linux.cc:405] InitializeSandbox() called with multiple threads in process gpu-process.
[pid=456557][err] [0419/005108.693973:INFO:CONSOLE:25631] "%cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold", source: webpack-internal:///(app-pages-browser)/../../../../../../../../mnt/vault/MWH/Projects/Agrodomain/node_modules/.pnpm/next@15.5.15_@playwright+test@1.59.1_react-dom@19.2.5_react@19.2.5__react@19.2.5/node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js (25631)
[pid=456557][err] [0419/005112.970347:INFO:CONSOLE:25631] "%cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold", source: webpack-internal:///(app-pages-browser)/../../../../../../../../mnt/vault/MWH/Projects/Agrodomain/node_modules/.pnpm/next@15.5.15_@playwright+test@1.59.1_react-dom@19.2.5_react@19.2.5__react@19.2.5/node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js (25631)
[pid=456557][err] [0419/005114.812791:INFO:CONSOLE:25631] "%cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold", source: webpack-internal:///(app-pages-browser)/../../../../../../../../mnt/vault/MWH/Projects/Agrodomain/node_modules/.pnpm/next@15.5.15_@playwright+test@1.59.1_react-dom@19.2.5_react@19.2.5__react@19.2.5/node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js (25631)
[pid=456557][err] Received signal 11 SEGV_MAPERR 000000000000
[pid=456557][err] #0 0x5d581be29f5a (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3954f59)
[pid=456557][err] #1 0x5d581f25bd24 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x6d86d23)
[pid=456557][err] #2 0x732879aa6050 (/usr/lib/x86_64-linux-gnu/libc.so.6+0x3c04f)
[pid=456557][err] #3 0x5d581ed698e7 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x68948e6)
[pid=456557][err] #4 0x5d581e41805e (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x5f4305d)
[pid=456557][err] #5 0x5d5819e5f7b4 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x198a7b3)
[pid=456557][err] #6 0x5d581b273921 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x2d9e920)
[pid=456557][err] #7 0x73287a603719 (/usr/lib/x86_64-linux-gnu/libglib-2.0.so.0.7400.6+0x54718)
[pid=456557][err] #8 0x2c980002daa0 ([anon:partition_alloc]+0x2c980002da9f)
[pid=456557][err] #9 0x5d581a6a52d3 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x21d02d2)
[pid=456557][err] #10 0x5d581a6a4a51 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x21cfa50)
[pid=456557][err] #11 0x5d581bc4b2ef (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x37762ee)
[pid=456557][err] #12 0x5d581c4bce66 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3fe7e65)
[pid=456557][err] #13 0x5d581c4bcfe6 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3fe7fe5)
[pid=456557][err] #14 0x5d581c4c0481 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3feb480)
[pid=456557][err] #15 0x5d581c4bd419 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3fe8418)
[pid=456557][err] #16 0x5d581c4bc50e (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3fe750d)
[pid=456557][err] #17 0x5d581ce57ad0 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x4982acf)
[pid=456557][err] #18 0x5d581ce58cf2 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x4983cf1)
[pid=456557][err] #19 0x732879a9124a (/usr/lib/x86_64-linux-gnu/libc.so.6+0x27249)
[pid=456557][err]   r8: 0000000000000004  r9: 000000000000fffe r10: 0000000000000000 r11: 0000000000000000
[pid=456557][err]  r12: 0000000000000000 r13: 00002c9c0036ea80 r14: 00002c9c00264000 r15: 0000000000000001
[pid=456557][err]   di: 0000000000000000  si: 00005d58235cfa00  bp: 00007ffd57ccfe20  bx: 0000000000000001
[pid=456557][err]   dx: a0ed4d0000000000  ax: 00002c9c004f2710  cx: 00005d581eb76490  sp: 00007ffd57ccfdd0
[pid=456557][err]   ip: 00005d581eb765dc efl: 0000000000010202 cgf: 002b000000000033 erf: 0000000000000004
[pid=456557][err]  trp: 000000000000000e msk: 0000000000000000 cr2: 0000000000000000
[pid=456557][err] [end of stack trace]
Call log:
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded

```

# Test source

```ts
  1   | import fs from "node:fs";
  2   | import path from "node:path";
  3   | 
  4   | import { expect, test, type Page, type TestInfo } from "@playwright/test";
  5   | 
  6   | import { gotoPath, signInAndGrantConsent } from "./helpers";
  7   | 
  8   | function proofPath(testInfo: TestInfo, name: string): string | null {
  9   |   const artifactDir = process.env.PLAYWRIGHT_ARTIFACT_DIR;
  10  |   if (!artifactDir) {
  11  |     return null;
  12  |   }
  13  |   const screenshotDir = path.join(artifactDir, "screenshots");
  14  |   fs.mkdirSync(screenshotDir, { recursive: true });
  15  |   return path.join(screenshotDir, `${testInfo.project.name}-${name}.png`);
  16  | }
  17  | 
  18  | async function captureProof(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  19  |   const screenshotPath = proofPath(testInfo, name);
  20  |   if (!screenshotPath) {
  21  |     return;
  22  |   }
  23  |   try {
> 24  |     await page.screenshot({ path: screenshotPath, fullPage: true });
      |                ^ Error: page.screenshot: Target crashed 
  25  |   } catch (error) {
  26  |     const message = error instanceof Error ? error.message : String(error);
  27  |     if (!message.includes("Page.captureScreenshot")) {
  28  |       throw error;
  29  |     }
  30  |     // Fallback for intermittent mobile full-page capture protocol failures.
  31  |     await page.screenshot({ path: screenshotPath, fullPage: false });
  32  |   }
  33  | }
  34  | 
  35  | async function openAdvisorRequestsWithRecovery(
  36  |   page: Page,
  37  |   authInput: Parameters<typeof signInAndGrantConsent>[1],
  38  | ): Promise<void> {
  39  |   const heading = page.getByRole("heading", { name: "Grounded guidance with reviewer state" });
  40  |   const onAuthGate =
  41  |     /\/signin(\?.*)?$/.test(page.url()) || /\/onboarding\/consent(\?.*)?$/.test(page.url());
  42  |   if (onAuthGate) {
  43  |     await signInAndGrantConsent(page, authInput);
  44  |   }
  45  | 
  46  |   await gotoPath(page, "/app/advisor");
  47  |   await expect(page).toHaveURL(/\/app\/advisor(\?.*)?$/, { timeout: 20_000 });
  48  |   await page.waitForLoadState("networkidle").catch(() => {});
  49  |   await page.waitForTimeout(500);
  50  | 
  51  |   await gotoPath(page, "/app/advisor/requests");
  52  |   await expect(page).toHaveURL(/\/app\/advisor\/requests(\?.*)?$/, { timeout: 20_000 });
  53  |   await expect(heading).toBeVisible({ timeout: 20_000 });
  54  | }
  55  | 
  56  | test.describe("N4 advisory and climate tranche diagnostics", () => {
  57  |   test("CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state", async ({
  58  |     page,
  59  |   }, testInfo) => {
  60  |     const runId = `${testInfo.project.name}-${Date.now()}`;
  61  |     const advisorIdentity = {
  62  |       displayName: "N4 Advisor QA",
  63  |       email: `advisor.n4.${runId}@example.com`,
  64  |       role: "advisor",
  65  |       countryCode: "GH",
  66  |     } as const;
  67  |     await signInAndGrantConsent(page, advisorIdentity);
  68  |     await openAdvisorRequestsWithRecovery(page, advisorIdentity);
  69  |     await expect(
  70  |       page.getByText(
  71  |         "Every response keeps citations, confidence, and reviewer posture visible before anyone treats it as field advice.",
  72  |       ),
  73  |     ).toBeVisible();
  74  |     await expect(page.getByText(/confidence/i).first()).toBeVisible();
  75  |     await expect(page.getByText(/Reviewer decision/i)).toBeVisible();
  76  |     await page.getByRole("button", { name: "Open citation drawer" }).click();
  77  |     await expect(page.getByRole("heading", { name: "Source proof" })).toBeVisible();
  78  |     await expect(page.getByText("Unverified input claims control")).toBeVisible();
  79  | 
  80  |     await captureProof(page, testInfo, "cj005-advisory-conversation");
  81  |   });
  82  | 
  83  |   test("CJ-006 EP-008 RJ-003 DI-006 climate route shows alert acknowledgement and MRV evidence", async ({
  84  |     page,
  85  |   }, testInfo) => {
  86  |     const runId = `${testInfo.project.name}-${Date.now()}`;
  87  |     await signInAndGrantConsent(page, {
  88  |       displayName: "N4 Farmer QA",
  89  |       email: `farmer.n4.${runId}@example.com`,
  90  |       role: "farmer",
  91  |       countryCode: "GH",
  92  |     });
  93  | 
  94  |     await gotoPath(page, "/app/climate/alerts");
  95  |     await expect(
  96  |       page.getByRole("heading", { name: "Live alert triage with visible degraded-mode posture" }),
  97  |     ).toBeVisible({ timeout: 20_000 });
  98  |     await expect(
  99  |       page.getByText(
  100 |         "Alert severity, acknowledgement state, source posture, and MRV assumptions stay visible together so operators do not over-read partial data.",
  101 |       ),
  102 |     ).toBeVisible();
  103 |     await expect(page.getByRole("button", { name: /Acknowledge alert/i })).toBeVisible();
  104 |     await expect(page.getByRole("heading", { name: "Assumptions and method references" })).toBeVisible();
  105 |     await expect(page.getByText("IPCC Tier 2 Annex 4")).toBeVisible();
  106 |     await expect(page.getByText(/Assumption/i).first()).toBeVisible();
  107 |     await expect(page.getByText(/degraded/i).first()).toBeVisible();
  108 | 
  109 |     await captureProof(page, testInfo, "cj006-climate-dashboard");
  110 |   });
  111 | });
  112 | 
```
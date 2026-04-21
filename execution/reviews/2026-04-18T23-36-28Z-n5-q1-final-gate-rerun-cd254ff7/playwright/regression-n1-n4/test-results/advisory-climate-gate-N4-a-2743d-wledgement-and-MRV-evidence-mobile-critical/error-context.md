# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: advisory-climate-gate.spec.ts >> N4 advisory and climate tranche diagnostics >> CJ-006 EP-008 RJ-003 DI-006 climate route shows alert acknowledgement and MRV evidence
- Location: tests/e2e/advisory-climate-gate.spec.ts:56:7

# Error details

```
Error: page.screenshot: Target crashed 
Browser logs:

<launching> /home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,BoundaryEventDispatchTracksNodeRemoval,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate,AutoDeElevate,RenderDocument,OptimizationHints --enable-features=CDPScreenshotNewSurface --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --edge-skip-compat-layer-relaunch --enable-automation --disable-infobars --disable-search-engine-choice-screen --disable-sync --enable-unsafe-swiftshader --headless --hide-scrollbars --mute-audio --blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4 --no-sandbox --user-data-dir=/tmp/playwright_chromiumdev_profile-Cu5cZt --remote-debugging-pipe --no-startup-window
<launched> pid=443917
[pid=443917][err] [0418/234007.802326:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=443917][err] [0418/234007.810222:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=443917][err] [0418/234007.810336:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=443917][err] [0418/234007.836699:WARNING:device/bluetooth/dbus/bluez_dbus_manager.cc:209] Floss manager service not available, cannot set Floss enable/disable.
[pid=443917][err] [0418/234008.077198:WARNING:sandbox/policy/linux/sandbox_linux.cc:405] InitializeSandbox() called with multiple threads in process gpu-process.
[pid=443917][err] [0418/234010.101301:INFO:CONSOLE:25631] "%cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold", source: webpack-internal:///(app-pages-browser)/../../../../../../../../mnt/vault/MWH/Projects/Agrodomain/node_modules/.pnpm/next@15.5.15_@playwright+test@1.59.1_react-dom@19.2.5_react@19.2.5__react@19.2.5/node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js (25631)
[pid=443917][err] [0418/234016.749458:INFO:CONSOLE:25631] "%cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold", source: webpack-internal:///(app-pages-browser)/../../../../../../../../mnt/vault/MWH/Projects/Agrodomain/node_modules/.pnpm/next@15.5.15_@playwright+test@1.59.1_react-dom@19.2.5_react@19.2.5__react@19.2.5/node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js (25631)
[pid=443917][err] Received signal 11 SEGV_MAPERR 000000000000
[pid=443917][err] #0 0x637637e22f5a (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3954f59)
[pid=443917][err] #1 0x63763b254d24 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x6d86d23)
[pid=443917][err] #2 0x70a221510050 (/usr/lib/x86_64-linux-gnu/libc.so.6+0x3c04f)
[pid=443917][err] #3 0x63763ad628e7 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x68948e6)
[pid=443917][err] #4 0x63763a41105e (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x5f4305d)
[pid=443917][err] #5 0x637635e587b4 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x198a7b3)
[pid=443917][err] #6 0x63763726c921 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x2d9e920)
[pid=443917][err] #7 0x70a22206d719 (/usr/lib/x86_64-linux-gnu/libglib-2.0.so.0.7400.6+0x54718)
[pid=443917][err] #8 0x3f380002daa0 ([anon:partition_alloc]+0x3f380002da9f)
[pid=443917][err] #9 0x63763669e2d3 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x21d02d2)
[pid=443917][err] #10 0x63763669da51 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x21cfa50)
[pid=443917][err] #11 0x637637c442ef (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x37762ee)
[pid=443917][err] #12 0x6376384b5e66 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3fe7e65)
[pid=443917][err] #13 0x6376384b5fe6 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3fe7fe5)
[pid=443917][err] #14 0x6376384b9481 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3feb480)
[pid=443917][err] #15 0x6376384b6419 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3fe8418)
[pid=443917][err] #16 0x6376384b550e (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3fe750d)
[pid=443917][err] #17 0x637638e50ad0 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x4982acf)
[pid=443917][err] #18 0x637638e51cf2 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x4983cf1)
[pid=443917][err] #19 0x70a2214fb24a (/usr/lib/x86_64-linux-gnu/libc.so.6+0x27249)
[pid=443917][err]   r8: 0000000000000004  r9: 000000000000fffe r10: 0000000000000000 r11: 0000000000000000
[pid=443917][err]  r12: 0000000000000000 r13: 00003f3c003cad80 r14: 00003f3c00268000 r15: 0000000000000002
[pid=443917][err]   di: 0000000000000000  si: 000063763f5c8a00  bp: 00007ffc1a2494d0  bx: 0000000000000001
[pid=443917][err]   dx: 901a300000000000  ax: 00003f3c00534050  cx: 000063763ab6f490  sp: 00007ffc1a249480
[pid=443917][err]   ip: 000063763ab6f5dc efl: 0000000000010206 cgf: 002b000000000033 erf: 0000000000000004
[pid=443917][err]  trp: 000000000000000e msk: 0000000000000000 cr2: 0000000000000000
[pid=443917][err] [end of stack trace]
Call log:
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded

```

# Test source

```ts
  1  | import fs from "node:fs";
  2  | import path from "node:path";
  3  | 
  4  | import { expect, test, type Page, type TestInfo } from "@playwright/test";
  5  | 
  6  | import { gotoPath, signInAndGrantConsent } from "./helpers";
  7  | 
  8  | function proofPath(testInfo: TestInfo, name: string): string | null {
  9  |   const artifactDir = process.env.PLAYWRIGHT_ARTIFACT_DIR;
  10 |   if (!artifactDir) {
  11 |     return null;
  12 |   }
  13 |   const screenshotDir = path.join(artifactDir, "screenshots");
  14 |   fs.mkdirSync(screenshotDir, { recursive: true });
  15 |   return path.join(screenshotDir, `${testInfo.project.name}-${name}.png`);
  16 | }
  17 | 
  18 | async function captureProof(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  19 |   const screenshotPath = proofPath(testInfo, name);
  20 |   if (!screenshotPath) {
  21 |     return;
  22 |   }
> 23 |   await page.screenshot({ path: screenshotPath, fullPage: true });
     |              ^ Error: page.screenshot: Target crashed 
  24 | }
  25 | 
  26 | test.describe("N4 advisory and climate tranche diagnostics", () => {
  27 |   test("CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state", async ({
  28 |     page,
  29 |   }, testInfo) => {
  30 |     const runId = `${testInfo.project.name}-${Date.now()}`;
  31 |     await signInAndGrantConsent(page, {
  32 |       displayName: "N4 Advisor QA",
  33 |       email: `advisor.n4.${runId}@example.com`,
  34 |       role: "advisor",
  35 |       countryCode: "GH",
  36 |     });
  37 | 
  38 |     await gotoPath(page, "/app/advisor/requests");
  39 |     await expect(
  40 |       page.getByRole("heading", { name: "Grounded guidance with reviewer state" }),
  41 |     ).toBeVisible({ timeout: 20_000 });
  42 |     await expect(
  43 |       page.getByText(
  44 |         "Every response keeps citations, confidence, and reviewer posture visible before anyone treats it as field advice.",
  45 |       ),
  46 |     ).toBeVisible();
  47 |     await expect(page.getByText(/confidence/i).first()).toBeVisible();
  48 |     await expect(page.getByText(/Reviewer decision/i)).toBeVisible();
  49 |     await page.getByRole("button", { name: "Open citation drawer" }).click();
  50 |     await expect(page.getByRole("heading", { name: "Source proof" })).toBeVisible();
  51 |     await expect(page.getByText("Unverified input claims control")).toBeVisible();
  52 | 
  53 |     await captureProof(page, testInfo, "cj005-advisory-conversation");
  54 |   });
  55 | 
  56 |   test("CJ-006 EP-008 RJ-003 DI-006 climate route shows alert acknowledgement and MRV evidence", async ({
  57 |     page,
  58 |   }, testInfo) => {
  59 |     const runId = `${testInfo.project.name}-${Date.now()}`;
  60 |     await signInAndGrantConsent(page, {
  61 |       displayName: "N4 Farmer QA",
  62 |       email: `farmer.n4.${runId}@example.com`,
  63 |       role: "farmer",
  64 |       countryCode: "GH",
  65 |     });
  66 | 
  67 |     await gotoPath(page, "/app/climate/alerts");
  68 |     await expect(
  69 |       page.getByRole("heading", { name: "Live alert triage with visible degraded-mode posture" }),
  70 |     ).toBeVisible({ timeout: 20_000 });
  71 |     await expect(
  72 |       page.getByText(
  73 |         "Alert severity, acknowledgement state, source posture, and MRV assumptions stay visible together so operators do not over-read partial data.",
  74 |       ),
  75 |     ).toBeVisible();
  76 |     await expect(page.getByRole("button", { name: /Acknowledge alert/i })).toBeVisible();
  77 |     await expect(page.getByRole("heading", { name: "Assumptions and method references" })).toBeVisible();
  78 |     await expect(page.getByText("IPCC Tier 2 Annex 4")).toBeVisible();
  79 |     await expect(page.getByText(/Assumption/i).first()).toBeVisible();
  80 |     await expect(page.getByText(/degraded/i).first()).toBeVisible();
  81 | 
  82 |     await captureProof(page, testInfo, "cj006-climate-dashboard");
  83 |   });
  84 | });
  85 | 
```
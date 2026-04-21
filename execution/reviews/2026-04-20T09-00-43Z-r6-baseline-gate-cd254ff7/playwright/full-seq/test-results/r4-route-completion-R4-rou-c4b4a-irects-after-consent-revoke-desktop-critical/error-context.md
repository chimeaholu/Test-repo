# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r4-route-completion.spec.ts >> R4 route completion proof >> server-authoritative home posture redirects after consent revoke
- Location: tests/e2e/r4-route-completion.spec.ts:301:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Protected path open/i)
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByText(/Protected path open/i)

```

```
Error: browserContext.close: Test ended.
Browser logs:

<launching> /home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,BoundaryEventDispatchTracksNodeRemoval,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate,AutoDeElevate,RenderDocument,OptimizationHints --enable-features=CDPScreenshotNewSurface --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --edge-skip-compat-layer-relaunch --enable-automation --disable-infobars --disable-search-engine-choice-screen --disable-sync --enable-unsafe-swiftshader --headless --hide-scrollbars --mute-audio --blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4 --no-sandbox --user-data-dir=/tmp/playwright_chromiumdev_profile-36zGom --remote-debugging-pipe --no-startup-window
<launched> pid=86415
[pid=86415][err] [0420/093034.232791:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=86415][err] [0420/093034.262251:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=86415][err] [0420/093034.262326:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=86415][err] [0420/093034.483464:WARNING:device/bluetooth/dbus/bluez_dbus_manager.cc:209] Floss manager service not available, cannot set Floss enable/disable.
[pid=86415][err] [0420/093036.437274:WARNING:sandbox/policy/linux/sandbox_linux.cc:405] InitializeSandbox() called with multiple threads in process gpu-process.
[pid=86415][err] [0420/093127.999821:INFO:CONSOLE:25631] "%cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold", source: webpack-internal:///(app-pages-browser)/../../../../../../../../mnt/vault/MWH/Projects/Agrodomain/node_modules/.pnpm/next@15.5.15_@playwright+test@1.59.1_react-dom@19.2.5_react@19.2.5__react@19.2.5/node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js (25631)
[pid=86415][err] [0420/093143.409794:INFO:CONSOLE:25631] "%cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold", source: webpack-internal:///(app-pages-browser)/../../../../../../../../mnt/vault/MWH/Projects/Agrodomain/node_modules/.pnpm/next@15.5.15_@playwright+test@1.59.1_react-dom@19.2.5_react@19.2.5__react@19.2.5/node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js (25631)
[pid=86415][err] Received signal 11 SEGV_MAPERR 000000000000
[pid=86415][err] #0 0x58151d8ecf5a (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3954f59)
[pid=86415][err] #1 0x581520d1ed24 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x6d86d23)
[pid=86415][err] #2 0x7915df6d6050 (/usr/lib/x86_64-linux-gnu/libc.so.6+0x3c04f)
[pid=86415][err] #3 0x58152063cc32 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x66a4c31)
[pid=86415][err] #4 0x581520639698 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x66a1697)
[pid=86415][err] #5 0x58152082c8e7 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x68948e6)
[pid=86415][err] #6 0x58151fedb05e (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x5f4305d)
[pid=86415][err] #7 0x58151b9227b4 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x198a7b3)
[pid=86415][err] #8 0x58151cd36921 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x2d9e920)
[pid=86415][err] #9 0x7915e0233719 (/usr/lib/x86_64-linux-gnu/libglib-2.0.so.0.7400.6+0x54718)
[pid=86415][err] #10 0x0ea00002daa0 ([anon:partition_alloc]+0xea00002da9f)
[pid=86415][err] #11 0x58151c1682d3 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x21d02d2)
[pid=86415][err] #12 0x58151c167a51 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x21cfa50)
[pid=86415][err] #13 0x58151d70e2ef (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x37762ee)
[pid=86415][err] #14 0x58151df7fe66 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3fe7e65)
[pid=86415][err] #15 0x58151df7ffe6 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3fe7fe5)
[pid=86415][err] #16 0x58151df83481 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3feb480)
[pid=86415][err] #17 0x58151df80419 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3fe8418)
[pid=86415][err] #18 0x58151df7f50e (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x3fe750d)
[pid=86415][err] #19 0x58151e91aad0 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x4982acf)
[pid=86415][err] #20 0x58151e91bcf2 (/home/node/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell+0x4983cf1)
[pid=86415][err] #21 0x7915df6c124a (/usr/lib/x86_64-linux-gnu/libc.so.6+0x27249)
[pid=86415][err]   r8: 0000000000000003  r9: 0000000000000200 r10: 0000000000000010 r11: fffffffc00000000
[pid=86415][err]  r12: 00000ea4006870c0 r13: 00000ea400264380 r14: 00007ffcbc6160c0 r15: 00000ea4001064c0
[pid=86415][err]   di: 0000000000000000  si: 00000ea4006a1e00  bp: 00007ffcbc616080  bx: 00000ea4006a1e00
[pid=86415][err]   dx: 00007ffcbc6160c0  ax: 00000ea400264000  cx: 0000000000000000  sp: 00007ffcbc615fa0
[pid=86415][err]   ip: 0000581520322942 efl: 0000000000010246 cgf: 002b000000000033 erf: 0000000000000004
[pid=86415][err]  trp: 000000000000000e msk: 0000000000000000 cr2: 0000000000000000
[pid=86415][err] [end of stack trace]
```
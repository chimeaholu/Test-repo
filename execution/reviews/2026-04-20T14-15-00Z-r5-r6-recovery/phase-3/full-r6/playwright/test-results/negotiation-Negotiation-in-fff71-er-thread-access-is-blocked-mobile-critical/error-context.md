# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: negotiation.spec.ts >> Negotiation inbox and thread proof >> pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked
- Location: tests/e2e/negotiation.spec.ts:252:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel('Listing title')
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByLabel('Listing title')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - button "Open Next.js Dev Tools" [ref=e8] [cursor=pointer]:
    - img [ref=e9]
  - alert [ref=e12]: Sign in to the right workspace without skipping access controls.
  - main [ref=e13]:
    - generic [ref=e14]:
      - article [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]: Identity check
          - generic [ref=e18]: Consent required next
        - heading "Sign in to the right workspace without skipping access controls." [level=1] [ref=e19]
        - paragraph [ref=e20]: Enter your name, work email, role, and operating country. Agrodomain routes you to the correct workspace, then asks for consent before any protected work begins.
        - generic [ref=e21]:
          - complementary [ref=e22]:
            - strong [ref=e23]: Field-first rule
            - paragraph [ref=e24]: Use the same identity details your team already uses so handoffs, recovery, and audit history remain clear.
          - complementary [ref=e25]:
            - strong [ref=e26]: Risk rule
            - paragraph [ref=e27]: Signing in identifies you. It does not authorize regulated actions until consent is granted.
        - generic "What happens next" [ref=e28]:
          - article [ref=e29]:
            - generic [ref=e30]: Step 1
            - strong [ref=e31]: Identity is recorded
            - paragraph [ref=e32]: Your role, email, and operating country are attached to the active session.
          - article [ref=e33]:
            - generic [ref=e34]: Step 2
            - strong [ref=e35]: Consent stays separate
            - paragraph [ref=e36]: The next route explains what is captured and what remains blocked.
          - article [ref=e37]:
            - generic [ref=e38]: Step 3
            - strong [ref=e39]: Routing happens after review
            - paragraph [ref=e40]: The workspace opens only after policy capture is complete.
      - article [ref=e41]:
        - generic [ref=e43]:
          - paragraph [ref=e44]: Identity entry
          - heading "Enter your work details" [level=2] [ref=e45]
          - paragraph [ref=e46]: Choose the role and country that match the work you need to resume today.
        - generic [ref=e47]:
          - paragraph [ref=e48]: Use the identity details attached to the work you need to resume. You can review consent before any protected action is enabled.
          - generic [ref=e49]:
            - generic [ref=e50]: Full name
            - textbox "Full name" [ref=e51]:
              - /placeholder: Ama Mensah
            - paragraph [ref=e52]: Use the name your cooperative, buyer group, or field team expects.
          - generic [ref=e53]:
            - generic [ref=e54]: Email
            - textbox "Email" [ref=e55]:
              - /placeholder: ama@example.com
            - paragraph [ref=e56]: This is used for account recovery, notifications, and route context.
          - generic [ref=e57]:
            - generic [ref=e58]: Role
            - combobox "Role" [ref=e59]:
              - option "Farmer" [selected]
              - option "Buyer"
              - option "Cooperative"
              - option "Advisor"
              - option "Finance"
              - option "Admin"
            - paragraph [ref=e60]: Choose the workspace you need today. This determines the protected route you reach after consent.
          - generic [ref=e61]:
            - generic [ref=e62]: Country pack
            - combobox "Country pack" [ref=e63]:
              - option "Ghana" [selected]
              - option "Nigeria"
              - option "Jamaica"
            - paragraph [ref=e64]: Country scope affects policy text, route framing, and operational context.
          - generic [ref=e65]:
            - button "Continue to onboarding" [ref=e66] [cursor=pointer]
            - paragraph [ref=e67]: No protected work is unlocked on this route.
        - generic "Route guarantees" [ref=e68]:
          - article [ref=e69]:
            - heading "Visible next step" [level=3] [ref=e70]
            - paragraph [ref=e71]: The route does not skip directly into a workspace. Consent review is always shown next.
          - article [ref=e72]:
            - heading "Clear accountability" [level=3] [ref=e73]
            - paragraph [ref=e74]: Your session identity is what later connects recovery events, approvals, and audit trails.
```

# Test source

```ts
  99  |             return session.consent?.state === "consent_granted";
  100 |           } catch {
  101 |             return false;
  102 |           }
  103 |         },
  104 |         [SESSION_KEY, TOKEN_KEY],
  105 |         { timeout: 30_000 },
  106 |       )
  107 |       .then(() => true)
  108 |       .catch(() => false);
  109 |     if (consentCaptured) {
  110 |       await restoreWorkspaceFromSession(page);
  111 |     }
  112 |   }
  113 | }
  114 | 
  115 | export async function signInAndGrantConsent(
  116 |   page: Page,
  117 |   input: {
  118 |     displayName: string;
  119 |     email: string;
  120 |     role: Role;
  121 |     countryCode?: "GH" | "NG" | "JM";
  122 |   },
  123 | ): Promise<void> {
  124 |   await signIn(page, input);
  125 |   await grantConsent(page);
  126 |   const sessionReady = await page
  127 |     .waitForFunction(
  128 |       ([sessionKey, tokenKey, role]) => {
  129 |         if (!window.localStorage.getItem(tokenKey)) {
  130 |           return false;
  131 |         }
  132 |         const raw = window.localStorage.getItem(sessionKey);
  133 |         if (!raw) {
  134 |           return false;
  135 |         }
  136 |         try {
  137 |           const session = JSON.parse(raw) as {
  138 |             actor?: { role?: string };
  139 |           };
  140 |           return session.actor?.role === role;
  141 |         } catch {
  142 |           return false;
  143 |         }
  144 |       },
  145 |       [SESSION_KEY, TOKEN_KEY, input.role],
  146 |       { timeout: 30_000 },
  147 |     )
  148 |     .then(() => true)
  149 |     .catch(() => false);
  150 |   if (!sessionReady) {
  151 |     await restoreWorkspaceFromSession(page);
  152 |   }
  153 |   await page.waitForFunction(
  154 |     ([sessionKey, tokenKey, role]) => {
  155 |       if (!window.localStorage.getItem(tokenKey)) {
  156 |         return false;
  157 |       }
  158 |       const raw = window.localStorage.getItem(sessionKey);
  159 |       if (!raw) {
  160 |         return false;
  161 |       }
  162 |       try {
  163 |         const session = JSON.parse(raw) as {
  164 |           actor?: { role?: string };
  165 |         };
  166 |         return session.actor?.role === role;
  167 |       } catch {
  168 |         return false;
  169 |       }
  170 |     },
  171 |     [SESSION_KEY, TOKEN_KEY, input.role],
  172 |     { timeout: 30_000 },
  173 |   );
  174 |   await gotoPath(page, roleHomeRoute[input.role]);
  175 |   await expect(page).toHaveURL(new RegExp(`${roleHomeRoute[input.role]}$`), {
  176 |     timeout: 20_000,
  177 |   });
  178 | }
  179 | 
  180 | export async function createListing(
  181 |   page: Page,
  182 |   input: {
  183 |     title: string;
  184 |     commodity: string;
  185 |     quantityTons: string;
  186 |     priceAmount: string;
  187 |     priceCurrency: string;
  188 |     location: string;
  189 |     summary: string;
  190 |   },
  191 | ): Promise<string> {
  192 |   await gotoPath(page, "/app/market/listings");
  193 |   const listingTitleField = page.getByLabel("Listing title");
  194 |   const listingFormVisible = await listingTitleField.isVisible({ timeout: 8_000 }).catch(() => false);
  195 |   if (!listingFormVisible) {
  196 |     await restoreWorkspaceFromSession(page);
  197 |     await gotoPath(page, "/app/market/listings");
  198 |   }
> 199 |   await expect(listingTitleField).toBeVisible({ timeout: 20_000 });
      |                                   ^ Error: expect(locator).toBeVisible() failed
  200 |   await listingTitleField.fill(input.title);
  201 |   await page.getByLabel("Commodity").fill(input.commodity);
  202 |   await page.getByLabel("Quantity (tons)").fill(input.quantityTons);
  203 |   await page.getByLabel("Price amount").fill(input.priceAmount);
  204 |   await page.getByLabel("Currency").fill(input.priceCurrency);
  205 |   await page.getByLabel("Location").fill(input.location);
  206 |   await page.getByLabel("Summary").fill(input.summary);
  207 |   const createButton = page.getByRole("button", { name: "Create listing" });
  208 |   await createButton.click();
  209 | 
  210 |   const listingItem = page.getByRole("listitem").filter({ hasText: input.title }).first();
  211 |   await expect(listingItem).toBeVisible({ timeout: 30_000 });
  212 |   const detailLink = listingItem.getByRole("link", { name: "View and edit" });
  213 |   await expect(detailLink).toBeVisible({ timeout: 30_000 });
  214 |   const href = await detailLink.getAttribute("href");
  215 |   if (!href) {
  216 |     throw new Error("Expected listing detail link href");
  217 |   }
  218 |   return href;
  219 | }
  220 | 
  221 | async function restoreWorkspaceFromSession(page: Page): Promise<void> {
  222 |   const role = await page.evaluate(([sessionKey]) => {
  223 |     const raw = window.localStorage.getItem(sessionKey);
  224 |     if (!raw) {
  225 |       return null;
  226 |     }
  227 |     try {
  228 |       const session = JSON.parse(raw) as { actor?: { role?: string } };
  229 |       return session.actor?.role ?? null;
  230 |     } catch {
  231 |       return null;
  232 |     }
  233 |   }, [SESSION_KEY]);
  234 | 
  235 |   if (!role || !(role in roleHomeRoute)) {
  236 |     return;
  237 |   }
  238 | 
  239 |   const route = roleHomeRoute[role as Role];
  240 |   await gotoPath(page, route);
  241 |   await expect(page).toHaveURL(new RegExp(`${route}(\\?.*)?$`), { timeout: 20_000 });
  242 | }
  243 | 
  244 | export function listingIdFromHref(href: string): string {
  245 |   const url = new URL(href, "http://127.0.0.1:3000");
  246 |   const segments = url.pathname.split("/").filter(Boolean);
  247 |   const listingId = segments.at(-1);
  248 |   if (!listingId) {
  249 |     throw new Error(`Expected listing id in href: ${href}`);
  250 |   }
  251 |   return listingId;
  252 | }
  253 | 
  254 | export async function gotoPath(page: Page, path: string): Promise<void> {
  255 |   for (let attempt = 0; attempt < 3; attempt += 1) {
  256 |     try {
  257 |       await page.goto(path, { waitUntil: "commit", timeout: 120_000 });
  258 |       const redirectedToSignIn = /\/signin(\?.*)?$/.test(page.url());
  259 |       const wantsProtectedRoute = path === "/app" || path.startsWith("/app/");
  260 |       if (redirectedToSignIn && wantsProtectedRoute) {
  261 |         const hasStoredSession = await page
  262 |           .evaluate(([sessionKey, tokenKey]) => {
  263 |             return Boolean(window.localStorage.getItem(sessionKey)) && Boolean(window.localStorage.getItem(tokenKey));
  264 |           }, [SESSION_KEY, TOKEN_KEY])
  265 |           .catch(() => false);
  266 |         if (hasStoredSession) {
  267 |           await restoreWorkspaceFromSession(page);
  268 |           continue;
  269 |         }
  270 |       }
  271 |       return;
  272 |     } catch (error) {
  273 |       const message = error instanceof Error ? error.message : String(error);
  274 |       if (
  275 |         (!message.includes("net::ERR_ABORTED") &&
  276 |           !message.includes("page crashed") &&
  277 |           !message.includes("net::ERR_INSUFFICIENT_RESOURCES")) ||
  278 |         attempt === 2
  279 |       ) {
  280 |         throw error;
  281 |       }
  282 |       await page.waitForTimeout(500);
  283 |     }
  284 |   }
  285 | }
  286 | 
  287 | async function waitForInteractiveForm(page: Page, route: "/signin" | "/onboarding/consent"): Promise<void> {
  288 |   await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}(\\?.*)?$`), {
  289 |     timeout: 20_000,
  290 |   });
  291 |   await expect(page.locator("form[data-interactive='true']")).toBeVisible({
  292 |     timeout: 20_000,
  293 |   });
  294 | }
  295 | 
```
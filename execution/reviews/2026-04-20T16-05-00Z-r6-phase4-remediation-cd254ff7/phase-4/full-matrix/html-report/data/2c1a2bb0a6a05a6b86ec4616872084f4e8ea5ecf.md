# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r5-ux-hardening.spec.ts >> R5 UX hardening proof >> captures seeded marketplace, wallet, notifications, and traceability flows
- Location: tests/e2e/r5-ux-hardening.spec.ts:337:7

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
  - alert [ref=e3]: Sign in to the right workspace without skipping access controls.
  - main [ref=e4]:
    - generic [ref=e5]:
      - article [ref=e6]:
        - generic [ref=e7]:
          - generic [ref=e8]: Identity check
          - generic [ref=e9]: Consent required next
        - heading "Sign in to the right workspace without skipping access controls." [level=1] [ref=e10]
        - paragraph [ref=e11]: Enter your name, work email, role, and operating country. Agrodomain routes you to the correct workspace, then asks for consent before any protected work begins.
        - generic [ref=e12]:
          - complementary [ref=e13]:
            - strong [ref=e14]: Field-first rule
            - paragraph [ref=e15]: Use the same identity details your team already uses so handoffs, recovery, and audit history remain clear.
          - complementary [ref=e16]:
            - strong [ref=e17]: Risk rule
            - paragraph [ref=e18]: Signing in identifies you. It does not authorize regulated actions until consent is granted.
        - generic "What happens next" [ref=e19]:
          - article [ref=e20]:
            - generic [ref=e21]: Step 1
            - strong [ref=e22]: Identity is recorded
            - paragraph [ref=e23]: Your role, email, and operating country are attached to the active session.
          - article [ref=e24]:
            - generic [ref=e25]: Step 2
            - strong [ref=e26]: Consent stays separate
            - paragraph [ref=e27]: The next route explains what is captured and what remains blocked.
          - article [ref=e28]:
            - generic [ref=e29]: Step 3
            - strong [ref=e30]: Routing happens after review
            - paragraph [ref=e31]: The workspace opens only after policy capture is complete.
      - article [ref=e32]:
        - generic [ref=e34]:
          - paragraph [ref=e35]: Identity entry
          - heading "Enter your work details" [level=2] [ref=e36]
          - paragraph [ref=e37]: Choose the role and country that match the work you need to resume today.
        - generic [ref=e38]:
          - paragraph [ref=e39]: Use the identity details attached to the work you need to resume. You can review consent before any protected action is enabled.
          - generic [ref=e40]:
            - generic [ref=e41]: Full name
            - textbox "Full name" [ref=e42]:
              - /placeholder: Ama Mensah
            - paragraph [ref=e43]: Use the name your cooperative, buyer group, or field team expects.
          - generic [ref=e44]:
            - generic [ref=e45]: Email
            - textbox "Email" [ref=e46]:
              - /placeholder: ama@example.com
            - paragraph [ref=e47]: This is used for account recovery, notifications, and route context.
          - generic [ref=e48]:
            - generic [ref=e49]: Role
            - combobox "Role" [ref=e50]:
              - option "Farmer" [selected]
              - option "Buyer"
              - option "Cooperative"
              - option "Advisor"
              - option "Finance"
              - option "Admin"
            - paragraph [ref=e51]: Choose the workspace you need today. This determines the protected route you reach after consent.
          - generic [ref=e52]:
            - generic [ref=e53]: Country pack
            - combobox "Country pack" [ref=e54]:
              - option "Ghana" [selected]
              - option "Nigeria"
              - option "Jamaica"
            - paragraph [ref=e55]: Country scope affects policy text, route framing, and operational context.
          - generic [ref=e56]:
            - button "Continue to onboarding" [ref=e57] [cursor=pointer]
            - paragraph [ref=e58]: No protected work is unlocked on this route.
        - generic "Route guarantees" [ref=e59]:
          - article [ref=e60]:
            - heading "Visible next step" [level=3] [ref=e61]
            - paragraph [ref=e62]: The route does not skip directly into a workspace. Consent review is always shown next.
          - article [ref=e63]:
            - heading "Clear accountability" [level=3] [ref=e64]
            - paragraph [ref=e65]: Your session identity is what later connects recovery events, approvals, and audit trails.
```

# Test source

```ts
  103 |             return false;
  104 |           }
  105 |           try {
  106 |             const session = JSON.parse(raw) as { consent?: { state?: string } };
  107 |             return session.consent?.state === "consent_granted";
  108 |           } catch {
  109 |             return false;
  110 |           }
  111 |         },
  112 |         [SESSION_KEY, TOKEN_KEY],
  113 |         { timeout: 30_000 },
  114 |       )
  115 |       .then(() => true)
  116 |       .catch(() => false);
  117 |     if (consentCaptured) {
  118 |       await restoreWorkspaceFromSession(page);
  119 |     }
  120 |   }
  121 | }
  122 | 
  123 | export async function signInAndGrantConsent(
  124 |   page: Page,
  125 |   input: SignInIdentity,
  126 | ): Promise<void> {
  127 |   await signIn(page, input);
  128 |   await grantConsent(page);
  129 |   const sessionReady = await page
  130 |     .waitForFunction(
  131 |       ([sessionKey, tokenKey, role]) => {
  132 |         if (!window.localStorage.getItem(tokenKey)) {
  133 |           return false;
  134 |         }
  135 |         const raw = window.localStorage.getItem(sessionKey);
  136 |         if (!raw) {
  137 |           return false;
  138 |         }
  139 |         try {
  140 |           const session = JSON.parse(raw) as {
  141 |             actor?: { role?: string };
  142 |           };
  143 |           return session.actor?.role === role;
  144 |         } catch {
  145 |           return false;
  146 |         }
  147 |       },
  148 |       [SESSION_KEY, TOKEN_KEY, input.role],
  149 |       { timeout: 30_000 },
  150 |     )
  151 |     .then(() => true)
  152 |     .catch(() => false);
  153 |   if (!sessionReady) {
  154 |     await restoreWorkspaceFromSession(page);
  155 |   }
  156 |   await page.waitForFunction(
  157 |     ([sessionKey, tokenKey, role]) => {
  158 |       if (!window.localStorage.getItem(tokenKey)) {
  159 |         return false;
  160 |       }
  161 |       const raw = window.localStorage.getItem(sessionKey);
  162 |       if (!raw) {
  163 |         return false;
  164 |       }
  165 |       try {
  166 |         const session = JSON.parse(raw) as {
  167 |           actor?: { role?: string };
  168 |         };
  169 |         return session.actor?.role === role;
  170 |       } catch {
  171 |         return false;
  172 |       }
  173 |     },
  174 |     [SESSION_KEY, TOKEN_KEY, input.role],
  175 |     { timeout: 30_000 },
  176 |   );
  177 |   await gotoPath(page, roleHomeRoute[input.role]);
  178 |   await expect(page).toHaveURL(new RegExp(`${roleHomeRoute[input.role]}$`), {
  179 |     timeout: 20_000,
  180 |   });
  181 |   identityByPage.set(page, input);
  182 | }
  183 | 
  184 | export async function createListing(
  185 |   page: Page,
  186 |   input: {
  187 |     title: string;
  188 |     commodity: string;
  189 |     quantityTons: string;
  190 |     priceAmount: string;
  191 |     priceCurrency: string;
  192 |     location: string;
  193 |     summary: string;
  194 |   },
  195 | ): Promise<string> {
  196 |   await gotoPath(page, "/app/market/listings");
  197 |   const listingTitleField = page.getByLabel("Listing title");
  198 |   const listingFormVisible = await listingTitleField.isVisible({ timeout: 8_000 }).catch(() => false);
  199 |   if (!listingFormVisible) {
  200 |     await restoreWorkspaceFromSession(page);
  201 |     await gotoPath(page, "/app/market/listings");
  202 |   }
> 203 |   await expect(listingTitleField).toBeVisible({ timeout: 20_000 });
      |                                   ^ Error: expect(locator).toBeVisible() failed
  204 |   await listingTitleField.fill(input.title);
  205 |   await page.getByLabel("Commodity").fill(input.commodity);
  206 |   await page.getByLabel("Quantity (tons)").fill(input.quantityTons);
  207 |   await page.getByLabel("Price amount").fill(input.priceAmount);
  208 |   await page.getByLabel("Currency").fill(input.priceCurrency);
  209 |   await page.getByLabel("Location").fill(input.location);
  210 |   await page.getByLabel("Summary").fill(input.summary);
  211 |   const createButton = page.getByRole("button", { name: "Create listing" });
  212 |   await createButton.click();
  213 | 
  214 |   const listingItem = page.getByRole("listitem").filter({ hasText: input.title }).first();
  215 |   await expect(listingItem).toBeVisible({ timeout: 30_000 });
  216 |   const detailLink = listingItem.getByRole("link", { name: "View and edit" });
  217 |   await expect(detailLink).toBeVisible({ timeout: 30_000 });
  218 |   const href = await detailLink.getAttribute("href");
  219 |   if (!href) {
  220 |     throw new Error("Expected listing detail link href");
  221 |   }
  222 |   return href;
  223 | }
  224 | 
  225 | async function restoreWorkspaceFromSession(page: Page): Promise<void> {
  226 |   const role = await page.evaluate(([sessionKey]) => {
  227 |     const raw = window.localStorage.getItem(sessionKey);
  228 |     if (!raw) {
  229 |       return null;
  230 |     }
  231 |     try {
  232 |       const session = JSON.parse(raw) as { actor?: { role?: string } };
  233 |       return session.actor?.role ?? null;
  234 |     } catch {
  235 |       return null;
  236 |     }
  237 |   }, [SESSION_KEY]);
  238 | 
  239 |   if (!role || !(role in roleHomeRoute)) {
  240 |     return;
  241 |   }
  242 | 
  243 |   const route = roleHomeRoute[role as Role];
  244 |   await gotoPath(page, route);
  245 |   await expect(page).toHaveURL(new RegExp(`${route}(\\?.*)?$`), { timeout: 20_000 });
  246 | }
  247 | 
  248 | export function listingIdFromHref(href: string): string {
  249 |   const url = new URL(href, "http://127.0.0.1:3000");
  250 |   const segments = url.pathname.split("/").filter(Boolean);
  251 |   const listingId = segments.at(-1);
  252 |   if (!listingId) {
  253 |     throw new Error(`Expected listing id in href: ${href}`);
  254 |   }
  255 |   return listingId;
  256 | }
  257 | 
  258 | export async function gotoPath(page: Page, path: string): Promise<void> {
  259 |   for (let attempt = 0; attempt < 3; attempt += 1) {
  260 |     try {
  261 |       await page.goto(path, { waitUntil: "commit", timeout: 120_000 });
  262 |       const redirectedToSignIn = /\/signin(\?.*)?$/.test(page.url());
  263 |       const wantsProtectedRoute = path === "/app" || path.startsWith("/app/");
  264 |       if (redirectedToSignIn && wantsProtectedRoute) {
  265 |         const hasStoredSession = await page
  266 |           .evaluate(([sessionKey, tokenKey]) => {
  267 |             return Boolean(window.localStorage.getItem(sessionKey)) && Boolean(window.localStorage.getItem(tokenKey));
  268 |           }, [SESSION_KEY, TOKEN_KEY])
  269 |           .catch(() => false);
  270 |         if (hasStoredSession) {
  271 |           await restoreWorkspaceFromSession(page);
  272 |           continue;
  273 |         }
  274 |         const cachedIdentity = identityByPage.get(page);
  275 |         if (cachedIdentity) {
  276 |           await signInAndGrantConsent(page, cachedIdentity);
  277 |           continue;
  278 |         }
  279 |       }
  280 |       return;
  281 |     } catch (error) {
  282 |       const message = error instanceof Error ? error.message : String(error);
  283 |       if (
  284 |         (!message.includes("net::ERR_ABORTED") &&
  285 |           !message.includes("page crashed") &&
  286 |           !message.includes("net::ERR_INSUFFICIENT_RESOURCES")) ||
  287 |         attempt === 2
  288 |       ) {
  289 |         throw error;
  290 |       }
  291 |       await page.waitForTimeout(500);
  292 |     }
  293 |   }
  294 | }
  295 | 
  296 | async function waitForInteractiveForm(page: Page, route: "/signin" | "/onboarding/consent"): Promise<void> {
  297 |   await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}(\\?.*)?$`), {
  298 |     timeout: 20_000,
  299 |   });
  300 |   await expect(page.locator("form[data-interactive='true']")).toBeVisible({
  301 |     timeout: 20_000,
  302 |   });
  303 | }
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketplace.spec.ts >> Marketplace create and read >> farmer creates a listing and reads it back from detail
- Location: tests/e2e/marketplace.spec.ts:6:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Premium cassava harvest 1776696047946').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('Premium cassava harvest 1776696047946').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e4]:
    - heading "404" [level=1] [ref=e5]
    - heading "This page could not be found." [level=2] [ref=e7]
  - button "Open Next.js Dev Tools" [ref=e13] [cursor=pointer]:
    - img [ref=e14]
  - alert [ref=e17]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | import { createListing, gotoPath, signInAndGrantConsent } from "./helpers";
  4  | 
  5  | test.describe("Marketplace create and read", () => {
  6  |   test("farmer creates a listing and reads it back from detail", async ({ page }) => {
  7  |     const title = `Premium cassava harvest ${Date.now()}`;
  8  | 
  9  |     await signInAndGrantConsent(page, {
  10 |       displayName: "Ama Mensah",
  11 |       email: `ama.${Date.now()}@example.com`,
  12 |       role: "farmer",
  13 |     });
  14 | 
  15 |     const detailHref = await createListing(page, {
  16 |       title,
  17 |       commodity: "Cassava",
  18 |       quantityTons: "4.2",
  19 |       priceAmount: "320",
  20 |       priceCurrency: "GHS",
  21 |       location: "Tamale, GH",
  22 |       summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
  23 |     });
  24 | 
  25 |     await gotoPath(page, detailHref);
  26 |     await expect(page).toHaveURL(/\/app\/market\/listings\/.+$/);
> 27 |     await expect(page.getByText(title).first()).toBeVisible();
     |                                                 ^ Error: expect(locator).toBeVisible() failed
  28 |     await expect(page.getByText("Price: 320 GHS")).toBeVisible();
  29 |     await expect(page.getByText("Location: Tamale, GH")).toBeVisible();
  30 |     await expect(page.getByText("Owner edit flow")).toBeVisible();
  31 |   });
  32 | 
  33 |   test("farmer edits a listing and sees optimistic reconciliation evidence", async ({
  34 |     page,
  35 |   }) => {
  36 |     const title = `Edit-ready cassava ${Date.now()}`;
  37 | 
  38 |     await signInAndGrantConsent(page, {
  39 |       displayName: "Akosua Mensah",
  40 |       email: `akosua.${Date.now()}@example.com`,
  41 |       role: "farmer",
  42 |     });
  43 | 
  44 |     const detailHref = await createListing(page, {
  45 |       title,
  46 |       commodity: "Cassava",
  47 |       quantityTons: "4.2",
  48 |       priceAmount: "320",
  49 |       priceCurrency: "GHS",
  50 |       location: "Tamale, GH",
  51 |       summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
  52 |     });
  53 | 
  54 |     await gotoPath(page, detailHref);
  55 |     await page.getByLabel("Listing title").fill(`${title} updated`);
  56 |     await page.getByLabel("Price amount").fill("345");
  57 |     await page.locator("#edit-status").selectOption("closed");
  58 |     await page
  59 |       .getByLabel("Summary")
  60 |       .fill("Bagged cassava stock updated after inspection and now marked closed.");
  61 |     await page.getByRole("button", { name: "Save listing edits" }).click();
  62 | 
  63 |     await expect(page.getByText("Optimistic state reconciled")).toBeVisible();
  64 |     await expect(page.getByText("Price: 345 GHS")).toBeVisible();
  65 |     await expect(page.getByText("Edit committed with audit linkage")).toBeVisible();
  66 |     await expect(page.getByText(`${title} updated`).first()).toBeVisible();
  67 |   });
  68 | });
  69 | 
```
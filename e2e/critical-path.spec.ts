import { expect, test } from "@playwright/test";

/**
 * MasterPlan.txt section 28's critical E2E flow, verbatim:
 * Browse product → Add to cart → Checkout → COD order → Admin sees order →
 * Admin changes status → Customer sees updated status.
 *
 * Runs against the real dev server + dev Supabase DB and creates a real order — see
 * playwright.config.ts and DATABASE.md's Phase 14 scope note. The admin account below is
 * a disclosed test account intentionally left in the dev DB since Phase 4 for exactly this
 * kind of live testing (see project memory / DATABASE.md), not a production credential.
 */
const ADMIN_EMAIL = "phase4.admin.mystore@gmail.com";
const ADMIN_PASSWORD = "TestPassword123!";
const PRODUCT_SLUG = "wireless-earbuds-pro";

test("browse → cart → COD checkout → admin updates status → customer sees it", async ({
  page,
}) => {
  // 1. Browse product
  await page.goto(`/products/${PRODUCT_SLUG}`);
  await expect(page.getByRole("heading", { name: "Wireless Earbuds Pro" })).toBeVisible();

  // 2. Add to cart
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to cart.")).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByText("Wireless Earbuds Pro")).toBeVisible();

  // 3. Checkout
  await page.getByRole("button", { name: "Checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  await page.getByLabel("Email").fill("e2e-guest@example.com");
  await page.getByLabel("Phone").fill("03001234567");
  await page.getByLabel("Recipient name").fill("E2E Test Customer");
  await page.getByLabel("Address").fill("456 Playwright Ave");
  await page.getByLabel("City").selectOption({ label: "Faisalabad" });

  // 4. Place the COD order
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/orders\/ORD-/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Thank you for your order" })).toBeVisible();

  const orderNumber = page.url().split("/orders/")[1];
  expect(orderNumber).toMatch(/^ORD-/);

  // 5. Admin sees the order
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("main").getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$|\/$/, { timeout: 15_000 });

  await page.goto(`/admin/orders?q=${orderNumber}`);
  await expect(page.getByRole("link", { name: orderNumber })).toBeVisible();

  // 6. Admin changes status
  await page.getByRole("link", { name: orderNumber }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${orderNumber}$`));
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByText("Order updated.")).toBeVisible();
  await expect(page.getByText(`· Confirmed`)).toBeVisible();

  // 7. Customer sees the updated status (guest bearer link — no login needed)
  await page.context().clearCookies();
  await page.goto(`/orders/${orderNumber}`);
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
});

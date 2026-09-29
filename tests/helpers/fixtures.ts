import { and, eq } from "drizzle-orm";
import {
  categories,
  cartItems,
  carts,
  countries,
  inventory,
  orders,
  paymentMethods,
  productCategories,
  products,
  profiles,
  shippingRates,
  shippingZones,
  states,
} from "@/db/schema";
import type { DbTransaction } from "@/modules/inventory/mutations";
import type { OrderAddressSnapshot } from "@/modules/checkout/mutations";

/** Reads real Phase-1-seeded reference data — never inserts it (that's the seed script's job). */
export async function getSeededCheckoutContext(tx: DbTransaction) {
  const [pakistan] = await tx.select().from(countries).where(eq(countries.code, "PK"));
  if (!pakistan) throw new Error("Seed data missing: Pakistan. Run `pnpm db:seed` first.");

  const [punjab] = await tx.select().from(states).where(eq(states.countryId, pakistan.id));

  const [codMethod] = await tx
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.code, "cod"), eq(paymentMethods.isActive, true)));
  if (!codMethod) throw new Error("Seed data missing: COD payment method.");

  const [zone] = await tx
    .select()
    .from(shippingZones)
    .where(eq(shippingZones.name, "Pakistan - Major Cities"));
  const [rate] = await tx
    .select()
    .from(shippingRates)
    .where(and(eq(shippingRates.zoneId, zone.id), eq(shippingRates.methodName, "Standard")));
  if (!rate) throw new Error("Seed data missing: a 'Standard' shipping rate.");

  const address: OrderAddressSnapshot = {
    recipientName: "Test Customer",
    phone: "03000000000",
    line1: "123 Test Street",
    cityName: "Faisalabad",
    stateName: punjab?.name,
    countryName: pakistan.name,
    countryId: pakistan.id,
    stateId: punjab?.id ?? null,
  };

  return { address, shippingRateId: rate.id as string };
}

/** Inserts a throwaway product + product-level inventory row, scoped to the test's rolled-back transaction. */
export async function createTestProduct(
  tx: DbTransaction,
  overrides: { price?: string; quantityOnHand?: number; reorderPoint?: number } = {},
) {
  const suffix = crypto.randomUUID().slice(0, 8);
  const [product] = await tx
    .insert(products)
    .values({
      name: `Test Product ${suffix}`,
      slug: `test-product-${suffix}`,
      sku: `TEST-${suffix}`,
      price: overrides.price ?? "1000.00",
      status: "active",
      hasVariants: false,
    })
    .returning();

  const [inventoryRow] = await tx
    .insert(inventory)
    .values({
      productId: product.id,
      quantityOnHand: overrides.quantityOnHand ?? 10,
      reorderPoint: overrides.reorderPoint ?? 2,
    })
    .returning();

  return { product, inventory: inventoryRow };
}

export async function attachProductToCategory(
  tx: DbTransaction,
  productId: string,
  categoryId: string,
) {
  await tx.insert(productCategories).values({ productId, categoryId });
}

export async function createTestCategory(tx: DbTransaction) {
  const suffix = crypto.randomUUID().slice(0, 8);
  const [category] = await tx
    .insert(categories)
    .values({ name: `Test Category ${suffix}`, slug: `test-category-${suffix}` })
    .returning();
  return category;
}

/**
 * Inserts a minimal, otherwise-unused `orders` row — just enough to satisfy
 * `coupon_usages.order_id`'s foreign key when a test needs an existing "prior redemption"
 * to check usage-limit logic against, without exercising the full `placeOrder()` flow.
 */
export async function createTestOrderStub(tx: DbTransaction) {
  const [codMethod] = await tx
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.code, "cod"), eq(paymentMethods.isActive, true)));
  if (!codMethod) throw new Error("Seed data missing: COD payment method.");

  const suffix = crypto.randomUUID().slice(0, 8);
  const [order] = await tx
    .insert(orders)
    .values({
      orderNumber: `TEST-${suffix}`,
      status: "pending",
      currencyCode: "PKR",
      subtotal: "0.00",
      total: "0.00",
      paymentMethodId: codMethod.id,
    })
    .returning();
  return order;
}

/**
 * `profiles.id` has a real Postgres FK to Supabase Auth's `auth.users`, which we can't
 * fabricate (no real signup happened) — so a "per-customer" test that needs *a* valid
 * profile id reads one that already exists (real signups from earlier phases' live
 * testing) rather than inserting a fake one. Read-only: this never modifies that profile.
 */
export async function getAnyExistingProfileId(tx: DbTransaction): Promise<string> {
  const [profile] = await tx.select({ id: profiles.id }).from(profiles).limit(1);
  if (!profile) {
    throw new Error(
      "No profiles exist in the dev DB — sign up at least one real account before running this test.",
    );
  }
  return profile.id;
}

/** Inserts a guest cart (identified by a throwaway session token) with one item. */
export async function createTestCart(
  tx: DbTransaction,
  items: { productId: string; quantity: number; unitPriceSnapshot: string }[],
) {
  const sessionToken = `test-session-${crypto.randomUUID()}`;
  const [cart] = await tx
    .insert(carts)
    .values({ sessionToken, currencyCode: "PKR" })
    .returning();

  for (const item of items) {
    await tx.insert(cartItems).values({
      cartId: cart.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPriceSnapshot: item.unitPriceSnapshot,
    });
  }

  return cart;
}

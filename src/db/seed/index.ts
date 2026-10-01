/**
 * Development seed data.
 *
 * Only seeds reference/config and catalog data that has no dependency on a real
 * Supabase Auth user (profiles/addresses/carts/orders/reviews/wishlists need a
 * real `auth.users` row, which doesn't exist until Phase 2 wires up authentication).
 * Safe to re-run: it deletes the rows it owns before re-inserting them, except
 * `roles`, `coupons`, `payment_methods`, `currencies`, `countries`, `states`, `cities`,
 * and `homepage_sections` — all upserted (onConflictDoNothing) instead, since real data
 * (orders, addresses, carts, user_roles) references them once anyone has used the app, and
 * deleting-then-reinserting would either fail on the FK or cascade-delete history.
 */
import { eq } from "drizzle-orm";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { db } = await import("../client");
  const schema = await import("../schema");
  const {
    currencies,
    countries,
    states,
    cities,
    taxRates,
    roles,
    paymentMethods,
    shippingZones,
    shippingZoneLocations,
    shippingRates,
    categories,
    products,
    productCategories,
    productAttributes,
    productAttributeValues,
    productVariants,
    variantAttributeValues,
    productImages,
    inventory,
    coupons,
    settings,
    homepageSections,
  } = schema;

  console.log("Resetting previously seeded rows...");
  await db.delete(inventory);
  await db.delete(productImages);
  await db.delete(variantAttributeValues);
  await db.delete(productVariants);
  await db.delete(productAttributeValues);
  await db.delete(productAttributes);
  await db.delete(productCategories);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(shippingRates);
  await db.delete(shippingZoneLocations);
  await db.delete(shippingZones);
  // roles, coupons, and payment_methods are intentionally NOT reset here: once real
  // orders/carts reference a coupon (coupon_usages, orders.coupon_id, carts.coupon_id), a
  // real user_roles references a role, or a real order references a payment method
  // (orders.payment_method_id), deleting-then-reinserting would either cascade-delete
  // usage history or fail outright on the FK, since all three tables' ids regenerate on
  // every insert (see the idempotent upserts below). payment_methods hit this for real the
  // first time this seed ran after Phase 6+ orders existed — same bug class as roles
  // (Phase 2) and coupons (Phase 9), now fixed the same way. currencies/countries/states/
  // cities are excluded for the identical reason: real addresses reference them once
  // anyone has checked out — this one crashed an actual seed run mid-way (after products/
  // categories/variants were already wiped by the earlier deletes above, but before they
  // were re-inserted below), which is exactly the failure mode this whole comment warns
  // about. states/cities gained real unique constraints (src/db/schema/reference.ts) so
  // they can use the same onConflictDoNothing pattern as everything else here.
  await db.delete(taxRates);
  await db.delete(settings);

  console.log("Seeding currencies & countries (idempotent)...");
  await db
    .insert(currencies)
    .values([
      { code: "PKR", name: "Pakistani Rupee", symbol: "Rs", decimalDigits: 0, isActive: true },
      { code: "USD", name: "US Dollar", symbol: "$", decimalDigits: 2, isActive: false },
      { code: "AED", name: "UAE Dirham", symbol: "AED", decimalDigits: 2, isActive: false },
      { code: "GBP", name: "British Pound", symbol: "£", decimalDigits: 2, isActive: false },
    ])
    .onConflictDoNothing({ target: currencies.code });

  await db
    .insert(countries)
    .values([
      { code: "PK", name: "Pakistan", currencyCode: "PKR", phoneCode: "+92" },
      { code: "US", name: "United States", currencyCode: "USD", phoneCode: "+1", isActive: false },
      {
        code: "AE",
        name: "United Arab Emirates",
        currencyCode: "AED",
        phoneCode: "+971",
        isActive: false,
      },
      { code: "GB", name: "United Kingdom", currencyCode: "GBP", phoneCode: "+44", isActive: false },
    ])
    .onConflictDoNothing({ target: countries.code });
  // Always re-fetched (never trusted from .returning(), which is empty for a row
  // onConflictDoNothing skipped) so downstream inserts get the real id either way.
  const [pakistan] = await db.select().from(countries).where(eq(countries.code, "PK"));

  console.log("Seeding states & cities (idempotent)...");
  await db
    .insert(states)
    .values([
      { countryId: pakistan.id, code: "SD", name: "Sindh" },
      { countryId: pakistan.id, code: "PB", name: "Punjab" },
      { countryId: pakistan.id, code: "IS", name: "Islamabad Capital Territory" },
    ])
    .onConflictDoNothing({ target: [states.countryId, states.name] });
  const pakistaniStates = await db.select().from(states).where(eq(states.countryId, pakistan.id));
  const sindh = pakistaniStates.find((s) => s.name === "Sindh")!;
  const punjab = pakistaniStates.find((s) => s.name === "Punjab")!;
  const ict = pakistaniStates.find((s) => s.name === "Islamabad Capital Territory")!;

  await db
    .insert(cities)
    .values([
      { countryId: pakistan.id, stateId: sindh.id, name: "Karachi" },
      { countryId: pakistan.id, stateId: punjab.id, name: "Lahore" },
      { countryId: pakistan.id, stateId: ict.id, name: "Islamabad" },
      { countryId: pakistan.id, stateId: punjab.id, name: "Rawalpindi" },
      { countryId: pakistan.id, stateId: punjab.id, name: "Faisalabad" },
    ])
    .onConflictDoNothing({ target: [cities.countryId, cities.stateId, cities.name] });
  const pakistaniCities = await db.select().from(cities).where(eq(cities.countryId, pakistan.id));
  const [karachi, lahore, islamabad, rawalpindi, faisalabad] = [
    "Karachi",
    "Lahore",
    "Islamabad",
    "Rawalpindi",
    "Faisalabad",
  ].map((name) => {
    const city = pakistaniCities.find((c) => c.name === name);
    if (!city) throw new Error(`Expected city "${name}" not found after seeding.`);
    return city;
  });

  console.log("Seeding tax rates...");
  await db
    .insert(taxRates)
    .values([
      { countryId: pakistan.id, name: "No Sales Tax (default)", rate: "0.0000", isActive: true },
    ]);

  console.log("Seeding roles (idempotent — never touches existing role grants)...");
  await db
    .insert(roles)
    .values([
      { name: "customer", description: "A registered shopper." },
      { name: "admin", description: "Full administrative access." },
      { name: "manager", description: "Store operations manager." },
      { name: "inventory_manager", description: "Manages stock and inventory movements." },
      { name: "support", description: "Customer support access." },
      { name: "marketing", description: "Manages coupons, content, and campaigns." },
    ])
    .onConflictDoNothing({ target: roles.name });

  console.log("Seeding payment methods (idempotent — never touches existing orders' FK)...");
  await db
    .insert(paymentMethods)
    .values([
      { code: "cod", name: "Cash on Delivery", isActive: true, sortOrder: 0 },
      {
        code: "manual_gateway",
        name: "Online Payment (coming soon)",
        isActive: false,
        sortOrder: 1,
        config: { note: "Placeholder for a future local/regional payment gateway integration." },
      },
    ])
    .onConflictDoNothing({ target: paymentMethods.code });

  console.log("Seeding shipping zones & rates...");
  const [majorCities, restOfPakistan] = await db
    .insert(shippingZones)
    .values([{ name: "Pakistan - Major Cities" }, { name: "Pakistan - Rest of Country" }])
    .returning();

  await db.insert(shippingZoneLocations).values([
    { zoneId: majorCities.id, countryId: pakistan.id, cityId: karachi.id },
    { zoneId: majorCities.id, countryId: pakistan.id, cityId: lahore.id },
    { zoneId: majorCities.id, countryId: pakistan.id, cityId: islamabad.id },
    { zoneId: majorCities.id, countryId: pakistan.id, cityId: rawalpindi.id },
    { zoneId: majorCities.id, countryId: pakistan.id, cityId: faisalabad.id },
    // Country-wide catch-all: matches any city not covered by a more specific zone.
    { zoneId: restOfPakistan.id, countryId: pakistan.id },
  ]);

  await db.insert(shippingRates).values([
    {
      zoneId: majorCities.id,
      methodName: "Standard",
      rateType: "order_value_based",
      baseRate: "200.00",
      freeShippingThreshold: "5000.00",
      sortOrder: 0,
    },
    {
      zoneId: majorCities.id,
      methodName: "Express",
      rateType: "flat",
      baseRate: "400.00",
      sortOrder: 1,
    },
    {
      zoneId: restOfPakistan.id,
      methodName: "Standard",
      rateType: "flat",
      baseRate: "350.00",
      sortOrder: 0,
    },
  ]);

  console.log("Seeding categories...");
  const [mensClothing, electronics, homeKitchen] = await db
    .insert(categories)
    .values([
      { name: "Men's Clothing", slug: "mens-clothing", sortOrder: 0 },
      { name: "Electronics", slug: "electronics", sortOrder: 1 },
      { name: "Home & Kitchen", slug: "home-kitchen", sortOrder: 2 },
    ])
    .returning();

  const [tshirts] = await db
    .insert(categories)
    .values([{ name: "T-Shirts", slug: "mens-t-shirts", parentId: mensClothing.id, sortOrder: 0 }])
    .returning();

  console.log("Seeding attributes...");
  const [sizeAttr, colorAttr] = await db
    .insert(productAttributes)
    .values([
      { name: "Size", slug: "size" },
      { name: "Color", slug: "color" },
    ])
    .returning();

  const [small, medium, large] = await db
    .insert(productAttributeValues)
    .values([
      { attributeId: sizeAttr.id, value: "Small", slug: "small", sortOrder: 0 },
      { attributeId: sizeAttr.id, value: "Medium", slug: "medium", sortOrder: 1 },
      { attributeId: sizeAttr.id, value: "Large", slug: "large", sortOrder: 2 },
    ])
    .returning();

  const [black, white] = await db
    .insert(productAttributeValues)
    .values([
      { attributeId: colorAttr.id, value: "Black", slug: "black", sortOrder: 0 },
      { attributeId: colorAttr.id, value: "White", slug: "white", sortOrder: 1 },
    ])
    .returning();

  console.log("Seeding products...");
  const [classicTee] = await db
    .insert(products)
    .values([
      {
        name: "Classic Crew T-Shirt",
        slug: "classic-crew-t-shirt",
        description:
          "A soft, breathable cotton crew-neck t-shirt available in multiple sizes and colors.",
        shortDescription: "Everyday cotton crew-neck tee.",
        brand: "StoreBrand",
        status: "active",
        isFeatured: true,
        hasVariants: true,
        seoTitle: "Classic Crew T-Shirt",
        seoDescription: "Shop the Classic Crew T-Shirt in multiple sizes and colors.",
      },
    ])
    .returning();

  const [earbuds] = await db
    .insert(products)
    .values([
      {
        name: "Wireless Earbuds Pro",
        slug: "wireless-earbuds-pro",
        sku: "ELEC-EARBUDS-PRO",
        description: "Bluetooth 5.3 wireless earbuds with active noise cancellation.",
        shortDescription: "ANC wireless earbuds.",
        brand: "StoreBrand",
        price: "8999.00",
        compareAtPrice: "10999.00",
        costPrice: "5500.00",
        weight: "0.050",
        status: "active",
        isFeatured: true,
        hasVariants: false,
        seoTitle: "Wireless Earbuds Pro",
        seoDescription: "Buy Wireless Earbuds Pro with active noise cancellation.",
      },
    ])
    .returning();

  const [bottle] = await db
    .insert(products)
    .values([
      {
        name: "Stainless Steel Water Bottle",
        slug: "stainless-steel-water-bottle",
        sku: "HOME-BOTTLE-1L",
        description: "Vacuum-insulated 1L stainless steel water bottle, keeps drinks cold 24h.",
        shortDescription: "Insulated 1L water bottle.",
        brand: "StoreBrand",
        price: "1799.00",
        costPrice: "900.00",
        weight: "0.350",
        status: "active",
        isFeatured: false,
        hasVariants: false,
      },
    ])
    .returning();

  await db.insert(productCategories).values([
    { productId: classicTee.id, categoryId: tshirts.id },
    { productId: classicTee.id, categoryId: mensClothing.id },
    { productId: earbuds.id, categoryId: electronics.id },
    { productId: bottle.id, categoryId: homeKitchen.id },
  ]);

  console.log("Seeding variants...");
  const sizeColorCombos = [
    { size: small, color: black, sku: "TEE-S-BLK" },
    { size: medium, color: black, sku: "TEE-M-BLK" },
    { size: large, color: black, sku: "TEE-L-BLK" },
    { size: small, color: white, sku: "TEE-S-WHT" },
    { size: medium, color: white, sku: "TEE-M-WHT" },
    { size: large, color: white, sku: "TEE-L-WHT" },
  ];

  const insertedVariants = await db
    .insert(productVariants)
    .values(
      sizeColorCombos.map(({ sku }) => ({
        productId: classicTee.id,
        sku,
        price: "1499.00",
        compareAtPrice: "1799.00",
        costPrice: "700.00",
        weight: "0.200",
        status: "active" as const,
      })),
    )
    .returning();

  await db.insert(variantAttributeValues).values(
    insertedVariants.flatMap((variant, i) => [
      { variantId: variant.id, attributeValueId: sizeColorCombos[i].size.id },
      { variantId: variant.id, attributeValueId: sizeColorCombos[i].color.id },
    ]),
  );

  console.log("Seeding product images (placeholder URLs pending Phase 3 media storage)...");
  await db.insert(productImages).values([
    {
      productId: classicTee.id,
      url: "https://placehold.co/800x800.png?text=Classic+Crew+Tee",
      sortOrder: 0,
    },
    {
      productId: earbuds.id,
      url: "https://placehold.co/800x800.png?text=Wireless+Earbuds+Pro",
      sortOrder: 0,
    },
    {
      productId: bottle.id,
      url: "https://placehold.co/800x800.png?text=Water+Bottle",
      sortOrder: 0,
    },
  ]);

  console.log("Seeding inventory...");
  await db.insert(inventory).values([
    ...insertedVariants.map((variant) => ({
      variantId: variant.id,
      quantityOnHand: 25,
      reorderPoint: 5,
    })),
    { productId: earbuds.id, quantityOnHand: 40, reorderPoint: 10 },
    { productId: bottle.id, quantityOnHand: 60, reorderPoint: 10 },
  ]);

  console.log("Seeding coupons...");
  await db
    .insert(coupons)
    .values([
      {
        code: "WELCOME10",
        description: "10% off your first order.",
        discountType: "percentage",
        discountValue: "10.00",
        minOrderValue: "2000.00",
        maxDiscountAmount: "1000.00",
        perCustomerLimit: 1,
        isActive: true,
      },
      {
        code: "FREESHIP",
        description: "Rs. 200 off to offset shipping.",
        discountType: "fixed",
        discountValue: "200.00",
        minOrderValue: "3000.00",
        isActive: true,
      },
    ])
    .onConflictDoNothing({ target: coupons.code });

  console.log("Seeding settings...");
  await db.insert(settings).values([
    { key: "store_name", value: "My Store" },
    { key: "support_email", value: "support@example.com" },
    { key: "default_low_stock_threshold", value: 5 },
  ]);

  // Not reset above, same reasoning as roles/coupons: admins edit these rows directly
  // (visibility + content) via /admin/homepage, so re-seeding must never clobber their edits.
  console.log("Seeding homepage sections (idempotent — never overwrites admin edits)...");
  await db
    .insert(homepageSections)
    .values([
      { key: "hero", isVisible: true, content: {} },
      { key: "categories", isVisible: true, content: { heading: "Shop by Category" } },
      { key: "featured_products", isVisible: true, content: { heading: "Featured" } },
      {
        key: "promo",
        isVisible: true,
        content: {
          eyebrow: "Limited time",
          heading: "Up to 30% off select electronics",
          subcopy: "This week only, while stocks last.",
          ctaLabel: "Shop the Sale",
          ctaLink: "/products",
          imageUrl: null,
        },
      },
      {
        key: "newsletter",
        isVisible: true,
        content: {
          heading: "Get first access",
          subcopy: "New arrivals, restocks and member-only pricing — straight to your inbox.",
        },
      },
    ])
    .onConflictDoNothing({ target: homepageSections.key });

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

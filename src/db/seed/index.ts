/**
 * Development seed data.
 *
 * Only seeds reference/config and catalog data that has no dependency on a real
 * Supabase Auth user (profiles/addresses/carts/orders/reviews/wishlists need a
 * real `auth.users` row, which doesn't exist until Phase 2 wires up authentication).
 * Safe to re-run: it deletes the rows it owns before re-inserting them.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

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
  await db.delete(coupons);
  await db.delete(paymentMethods);
  await db.delete(roles);
  await db.delete(taxRates);
  await db.delete(cities);
  await db.delete(states);
  await db.delete(countries);
  await db.delete(currencies);
  await db.delete(settings);

  console.log("Seeding currencies & countries...");
  await db.insert(currencies).values([
    { code: "PKR", name: "Pakistani Rupee", symbol: "Rs", decimalDigits: 0, isActive: true },
    { code: "USD", name: "US Dollar", symbol: "$", decimalDigits: 2, isActive: false },
    { code: "AED", name: "UAE Dirham", symbol: "AED", decimalDigits: 2, isActive: false },
    { code: "GBP", name: "British Pound", symbol: "£", decimalDigits: 2, isActive: false },
  ]);

  const [pakistan] = await db
    .insert(countries)
    .values([{ code: "PK", name: "Pakistan", currencyCode: "PKR", phoneCode: "+92" }])
    .returning();
  await db.insert(countries).values([
    { code: "US", name: "United States", currencyCode: "USD", phoneCode: "+1", isActive: false },
    {
      code: "AE",
      name: "United Arab Emirates",
      currencyCode: "AED",
      phoneCode: "+971",
      isActive: false,
    },
    { code: "GB", name: "United Kingdom", currencyCode: "GBP", phoneCode: "+44", isActive: false },
  ]);

  console.log("Seeding states & cities...");
  const [sindh, punjab, ict] = await db
    .insert(states)
    .values([
      { countryId: pakistan.id, code: "SD", name: "Sindh" },
      { countryId: pakistan.id, code: "PB", name: "Punjab" },
      { countryId: pakistan.id, code: "IS", name: "Islamabad Capital Territory" },
    ])
    .returning();

  const [karachi, lahore, islamabad, rawalpindi, faisalabad] = await db
    .insert(cities)
    .values([
      { countryId: pakistan.id, stateId: sindh.id, name: "Karachi" },
      { countryId: pakistan.id, stateId: punjab.id, name: "Lahore" },
      { countryId: pakistan.id, stateId: ict.id, name: "Islamabad" },
      { countryId: pakistan.id, stateId: punjab.id, name: "Rawalpindi" },
      { countryId: pakistan.id, stateId: punjab.id, name: "Faisalabad" },
    ])
    .returning();

  console.log("Seeding tax rates...");
  await db
    .insert(taxRates)
    .values([
      { countryId: pakistan.id, name: "No Sales Tax (default)", rate: "0.0000", isActive: true },
    ]);

  console.log("Seeding roles...");
  await db.insert(roles).values([
    { name: "customer", description: "A registered shopper." },
    { name: "admin", description: "Full administrative access." },
    { name: "manager", description: "Store operations manager." },
    { name: "inventory_manager", description: "Manages stock and inventory movements." },
    { name: "support", description: "Customer support access." },
    { name: "marketing", description: "Manages coupons, content, and campaigns." },
  ]);

  console.log("Seeding payment methods...");
  await db.insert(paymentMethods).values([
    { code: "cod", name: "Cash on Delivery", isActive: true, sortOrder: 0 },
    {
      code: "manual_gateway",
      name: "Online Payment (coming soon)",
      isActive: false,
      sortOrder: 1,
      config: { note: "Placeholder for a future local/regional payment gateway integration." },
    },
  ]);

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
        seoTitle: "Classic Crew T-Shirt | My Store",
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
        seoTitle: "Wireless Earbuds Pro | My Store",
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
      url: "https://placehold.co/800x800?text=Classic+Crew+Tee",
      sortOrder: 0,
    },
    {
      productId: earbuds.id,
      url: "https://placehold.co/800x800?text=Wireless+Earbuds+Pro",
      sortOrder: 0,
    },
    { productId: bottle.id, url: "https://placehold.co/800x800?text=Water+Bottle", sortOrder: 0 },
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
  await db.insert(coupons).values([
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
  ]);

  console.log("Seeding settings...");
  await db.insert(settings).values([
    { key: "store_name", value: "My Store" },
    { key: "support_email", value: "support@example.com" },
    { key: "default_low_stock_threshold", value: 5 },
  ]);

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

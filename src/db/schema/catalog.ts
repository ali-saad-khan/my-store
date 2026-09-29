import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { productStatusEnum } from "./enums";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/**
 * Base product. `price`/`sku` are only used directly when `hasVariants` is
 * false — products with variants price/track stock at the variant level.
 */
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sku: text("sku").unique(),
  description: text("description"),
  shortDescription: text("short_description"),
  brand: text("brand"),
  price: numeric("price", { precision: 12, scale: 2 }),
  compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  weight: numeric("weight", { precision: 10, scale: 3 }),
  status: productStatusEnum("status").notNull().default("draft"),
  isFeatured: boolean("is_featured").notNull().default(false),
  hasVariants: boolean("has_variants").notNull().default(false),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: text("seo_keywords"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.categoryId] }),
    // The composite PK is (productId, categoryId) — efficient for "categories of a
    // product" but not for "products in a category" (every category page), since
    // categoryId isn't the leading column there. This covers that direction.
    index("product_categories_category_id_idx").on(table.categoryId),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references((): AnyPgColumn => productVariants.id, {
      onDelete: "cascade",
    }),
    url: text("url").notNull(),
    altText: text("alt_text"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("product_images_product_id_idx").on(table.productId)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
    costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
    weight: numeric("weight", { precision: 10, scale: 3 }),
    status: productStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("product_variants_product_id_idx").on(table.productId)],
);

/** e.g. "Size", "Color", "Material" */
export const productAttributes = pgTable("product_attributes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** e.g. "Small", "Black" under the "Size"/"Color" attribute */
export const productAttributeValues = pgTable("product_attribute_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  attributeId: uuid("attribute_id")
    .notNull()
    .references(() => productAttributes.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
  slug: text("slug").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Encodes e.g. variant "Small / Black" as two rows pointing at that variant. */
export const variantAttributeValues = pgTable(
  "variant_attribute_values",
  {
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    attributeValueId: uuid("attribute_value_id")
      .notNull()
      .references(() => productAttributeValues.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.variantId, table.attributeValueId] })],
);

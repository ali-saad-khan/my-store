import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { addressTypeEnum } from "./enums";
import { profiles } from "./identity";
import { cities, countries, states } from "./reference";

/** A customer's saved address book entry. */
export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: addressTypeEnum("type").notNull().default("shipping"),
    recipientName: text("recipient_name").notNull(),
    phone: text("phone").notNull(),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id),
    stateId: uuid("state_id").references(() => states.id),
    cityId: uuid("city_id").references(() => cities.id),
    cityName: text("city_name").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    postalCode: text("postal_code"),
    isDefaultShipping: boolean("is_default_shipping").notNull().default(false),
    isDefaultBilling: boolean("is_default_billing").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("addresses_profile_id_idx").on(table.profileId)],
);

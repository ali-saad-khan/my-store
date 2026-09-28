import { relations } from "drizzle-orm";
import { addresses } from "./addresses";
import {
  categories,
  productAttributeValues,
  productAttributes,
  productCategories,
  productImages,
  productVariants,
  products,
  variantAttributeValues,
} from "./catalog";
import { cartItems, carts } from "./cart";
import { couponCategories, couponProducts, coupons } from "./coupons";
import { profiles, roles, userRoles } from "./identity";
import { inventory, inventoryMovements } from "./inventory";
import { notifications } from "./notifications";
import { orderAddresses, orderItems, orderStatusHistory, orders, couponUsages } from "./orders";
import { paymentMethods } from "./payment-methods";
import { paymentTransactions, payments } from "./payments";
import { reviews } from "./reviews";
import { cities, countries, states, taxRates } from "./reference";
import {
  shipmentTracking,
  shipments,
  shippingRates,
  shippingZoneLocations,
  shippingZones,
} from "./shipping";
import { wishlistItems, wishlists } from "./wishlist";

export const profilesRelations = relations(profiles, ({ many }) => ({
  userRoles: many(userRoles),
  addresses: many(addresses),
  orders: many(orders),
  reviews: many(reviews),
  wishlist: many(wishlists),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  profile: one(profiles, { fields: [userRoles.profileId], references: [profiles.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  profile: one(profiles, { fields: [addresses.profileId], references: [profiles.id] }),
  country: one(countries, { fields: [addresses.countryId], references: [countries.id] }),
  state: one(states, { fields: [addresses.stateId], references: [states.id] }),
  city: one(cities, { fields: [addresses.cityId], references: [cities.id] }),
}));

export const countriesRelations = relations(countries, ({ many }) => ({
  states: many(states),
  cities: many(cities),
}));

export const statesRelations = relations(states, ({ one, many }) => ({
  country: one(countries, { fields: [states.countryId], references: [countries.id] }),
  cities: many(cities),
}));

export const citiesRelations = relations(cities, ({ one }) => ({
  country: one(countries, { fields: [cities.countryId], references: [countries.id] }),
  state: one(states, { fields: [cities.stateId], references: [states.id] }),
}));

export const taxRatesRelations = relations(taxRates, ({ one }) => ({
  country: one(countries, { fields: [taxRates.countryId], references: [countries.id] }),
  state: one(states, { fields: [taxRates.stateId], references: [states.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id] }),
  productCategories: many(productCategories),
}));

export const productsRelations = relations(products, ({ many }) => ({
  productCategories: many(productCategories),
  images: many(productImages),
  variants: many(productVariants),
  inventory: many(inventory),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, { fields: [productCategories.productId], references: [products.id] }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
  variant: one(productVariants, {
    fields: [productImages.variantId],
    references: [productVariants.id],
  }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  images: many(productImages),
  attributeValues: many(variantAttributeValues),
  inventory: many(inventory),
}));

export const productAttributesRelations = relations(productAttributes, ({ many }) => ({
  values: many(productAttributeValues),
}));

export const productAttributeValuesRelations = relations(
  productAttributeValues,
  ({ one, many }) => ({
    attribute: one(productAttributes, {
      fields: [productAttributeValues.attributeId],
      references: [productAttributes.id],
    }),
    variantAttributeValues: many(variantAttributeValues),
  }),
);

export const variantAttributeValuesRelations = relations(variantAttributeValues, ({ one }) => ({
  variant: one(productVariants, {
    fields: [variantAttributeValues.variantId],
    references: [productVariants.id],
  }),
  attributeValue: one(productAttributeValues, {
    fields: [variantAttributeValues.attributeValueId],
    references: [productAttributeValues.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  product: one(products, { fields: [inventory.productId], references: [products.id] }),
  variant: one(productVariants, {
    fields: [inventory.variantId],
    references: [productVariants.id],
  }),
  movements: many(inventoryMovements),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  inventory: one(inventory, {
    fields: [inventoryMovements.inventoryId],
    references: [inventory.id],
  }),
  createdBy: one(profiles, {
    fields: [inventoryMovements.createdBy],
    references: [profiles.id],
  }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  profile: one(profiles, { fields: [carts.profileId], references: [profiles.id] }),
  coupon: one(coupons, { fields: [carts.couponId], references: [coupons.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  products: many(couponProducts),
  categories: many(couponCategories),
  usages: many(couponUsages),
}));

export const couponProductsRelations = relations(couponProducts, ({ one }) => ({
  coupon: one(coupons, { fields: [couponProducts.couponId], references: [coupons.id] }),
  product: one(products, { fields: [couponProducts.productId], references: [products.id] }),
}));

export const couponCategoriesRelations = relations(couponCategories, ({ one }) => ({
  coupon: one(coupons, { fields: [couponCategories.couponId], references: [coupons.id] }),
  category: one(categories, {
    fields: [couponCategories.categoryId],
    references: [categories.id],
  }),
}));

export const couponUsagesRelations = relations(couponUsages, ({ one }) => ({
  coupon: one(coupons, { fields: [couponUsages.couponId], references: [coupons.id] }),
  order: one(orders, { fields: [couponUsages.orderId], references: [orders.id] }),
  profile: one(profiles, { fields: [couponUsages.profileId], references: [profiles.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  profile: one(profiles, { fields: [orders.profileId], references: [profiles.id] }),
  coupon: one(coupons, { fields: [orders.couponId], references: [coupons.id] }),
  paymentMethod: one(paymentMethods, {
    fields: [orders.paymentMethodId],
    references: [paymentMethods.id],
  }),
  items: many(orderItems),
  addresses: many(orderAddresses),
  statusHistory: many(orderStatusHistory),
  payments: many(payments),
  shipments: many(shipments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const orderAddressesRelations = relations(orderAddresses, ({ one }) => ({
  order: one(orders, { fields: [orderAddresses.orderId], references: [orders.id] }),
  sourceAddress: one(addresses, {
    fields: [orderAddresses.sourceAddressId],
    references: [addresses.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
  changedBy: one(profiles, {
    fields: [orderStatusHistory.changedBy],
    references: [profiles.id],
  }),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ many }) => ({
  orders: many(orders),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  paymentMethod: one(paymentMethods, {
    fields: [payments.paymentMethodId],
    references: [paymentMethods.id],
  }),
  transactions: many(paymentTransactions),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  payment: one(payments, { fields: [paymentTransactions.paymentId], references: [payments.id] }),
}));

export const shippingZonesRelations = relations(shippingZones, ({ many }) => ({
  locations: many(shippingZoneLocations),
  rates: many(shippingRates),
}));

export const shippingZoneLocationsRelations = relations(shippingZoneLocations, ({ one }) => ({
  zone: one(shippingZones, {
    fields: [shippingZoneLocations.zoneId],
    references: [shippingZones.id],
  }),
  country: one(countries, {
    fields: [shippingZoneLocations.countryId],
    references: [countries.id],
  }),
  state: one(states, { fields: [shippingZoneLocations.stateId], references: [states.id] }),
  city: one(cities, { fields: [shippingZoneLocations.cityId], references: [cities.id] }),
}));

export const shippingRatesRelations = relations(shippingRates, ({ one, many }) => ({
  zone: one(shippingZones, { fields: [shippingRates.zoneId], references: [shippingZones.id] }),
  shipments: many(shipments),
}));

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  order: one(orders, { fields: [shipments.orderId], references: [orders.id] }),
  shippingRate: one(shippingRates, {
    fields: [shipments.shippingRateId],
    references: [shippingRates.id],
  }),
  tracking: many(shipmentTracking),
}));

export const shipmentTrackingRelations = relations(shipmentTracking, ({ one }) => ({
  shipment: one(shipments, {
    fields: [shipmentTracking.shipmentId],
    references: [shipments.id],
  }),
}));

export const wishlistsRelations = relations(wishlists, ({ one, many }) => ({
  profile: one(profiles, { fields: [wishlists.profileId], references: [profiles.id] }),
  items: many(wishlistItems),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  wishlist: one(wishlists, { fields: [wishlistItems.wishlistId], references: [wishlists.id] }),
  product: one(products, { fields: [wishlistItems.productId], references: [products.id] }),
  variant: one(productVariants, {
    fields: [wishlistItems.variantId],
    references: [productVariants.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  profile: one(profiles, { fields: [reviews.profileId], references: [profiles.id] }),
  orderItem: one(orderItems, {
    fields: [reviews.orderItemId],
    references: [orderItems.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  profile: one(profiles, { fields: [notifications.profileId], references: [profiles.id] }),
}));

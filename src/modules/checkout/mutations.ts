import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  carts,
  cartItems,
  couponUsages,
  orderAddresses,
  orderItems,
  orderStatusHistory,
  orders,
  paymentMethods,
  paymentTransactions,
  payments,
  shippingRates,
  taxRates,
} from "@/db/schema";
import { DEFAULT_MARKET } from "@/config/market";
import { round2 } from "@/lib/money";
import { getSellableItem } from "@/modules/cart/queries";
import { isCouponValidationError, validateCoupon } from "@/modules/coupons/discount";
import { adjustInventoryTx, type DbTransaction } from "@/modules/inventory/mutations";
import { calculateShippingCost } from "./shipping-cost";
import { computeOrderTotals } from "./totals";
import { selectTaxRate, type TaxRateRow } from "./tax";
import { generateOrderNumber } from "./order-number";

export class EmptyCartError extends Error {
  constructor() {
    super("Your cart is empty.");
    this.name = "EmptyCartError";
  }
}

export class ItemUnavailableError extends Error {
  constructor(public productName: string) {
    super(`"${productName}" is no longer available and was removed from your order.`);
    this.name = "ItemUnavailableError";
  }
}

export class InsufficientStockForOrderError extends Error {
  constructor(
    public productName: string,
    public available: number,
  ) {
    super(
      available > 0
        ? `Only ${available} of "${productName}" left in stock.`
        : `"${productName}" is out of stock.`,
    );
    this.name = "InsufficientStockForOrderError";
  }
}

export class InvalidShippingRateError extends Error {
  constructor() {
    super("Select a valid shipping method for your order.");
    this.name = "InvalidShippingRateError";
  }
}

export class PaymentMethodUnavailableError extends Error {
  constructor() {
    super("Cash on Delivery isn't available right now.");
    this.name = "PaymentMethodUnavailableError";
  }
}

export class CouponNoLongerValidError extends Error {
  constructor(message: string) {
    super(`${message} Remove it to continue.`);
    this.name = "CouponNoLongerValidError";
  }
}

export type OrderAddressSnapshot = {
  sourceAddressId?: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  cityName: string;
  stateName?: string;
  countryName: string;
  countryId: string;
  stateId: string | null;
  postalCode?: string;
};

export async function placeOrder(
  params: {
    cartOwner: { profileId: string } | { sessionToken: string };
    profileId: string | null;
    email: string;
    phone: string;
    address: OrderAddressSnapshot;
    shippingRateId: string;
    notes?: string;
  },
  client: DbTransaction | typeof db = db,
) {
  return client.transaction(async (tx) => {
    const cart = await tx.query.carts.findFirst({
      where:
        "profileId" in params.cartOwner
          ? eq(carts.profileId, params.cartOwner.profileId)
          : eq(carts.sessionToken, params.cartOwner.sessionToken),
      with: { items: true },
    });
    if (!cart || cart.items.length === 0) throw new EmptyCartError();

    const lines = [];
    for (const item of cart.items) {
      const sellable = await getSellableItem(
        { productId: item.productId, variantId: item.variantId ?? undefined },
        tx,
      );
      if (!sellable) throw new ItemUnavailableError(item.productId);
      if (sellable.quantityAvailable < item.quantity) {
        throw new InsufficientStockForOrderError(sellable.productName, sellable.quantityAvailable);
      }
      lines.push({
        ...sellable,
        cartItemId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      });
    }

    const subtotal = round2(lines.reduce((sum, l) => sum + Number(l.price) * l.quantity, 0));
    const totalWeightKg = lines.reduce((sum, l) => sum + Number(l.weight ?? 0) * l.quantity, 0);

    let discountTotal = 0;
    let appliedCouponId: string | null = null;
    const perLineDiscount = new Map<string, number>();
    if (cart.couponId) {
      try {
        const result = await validateCoupon(tx, {
          identifier: { couponId: cart.couponId },
          profileId: params.profileId,
          lines: lines.map((line) => ({
            key: line.cartItemId,
            productId: line.productId,
            lineSubtotal: Number(line.price) * line.quantity,
          })),
        });
        discountTotal = result.discountAmount;
        appliedCouponId = result.coupon.id;
        for (const [key, amount] of result.perLineDiscount) perLineDiscount.set(key, amount);
      } catch (error) {
        if (isCouponValidationError(error)) throw new CouponNoLongerValidError(error.message);
        throw error;
      }
    }

    const [rate] = await tx
      .select()
      .from(shippingRates)
      .where(and(eq(shippingRates.id, params.shippingRateId), eq(shippingRates.isActive, true)));
    if (!rate) throw new InvalidShippingRateError();

    const shippingCost = calculateShippingCost(rate, { subtotal, totalWeightKg });
    if (shippingCost === null) throw new InvalidShippingRateError();

    const [codMethod] = await tx
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.code, "cod"), eq(paymentMethods.isActive, true)));
    if (!codMethod) throw new PaymentMethodUnavailableError();

    const taxRate = await getApplicableTaxRate(
      tx,
      params.address.countryId,
      params.address.stateId,
    );
    const { taxTotal, total } = computeOrderTotals({
      subtotal,
      discountTotal,
      shippingCost,
      taxRate,
    });

    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber: generateOrderNumber(),
        profileId: params.profileId,
        guestEmail: params.profileId ? null : params.email,
        guestPhone: params.profileId ? null : params.phone,
        status: "pending",
        currencyCode: DEFAULT_MARKET.currencyCode,
        subtotal: subtotal.toFixed(2),
        discountTotal: discountTotal.toFixed(2),
        shippingTotal: shippingCost.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
        couponId: appliedCouponId,
        paymentMethodId: codMethod.id,
        notes: params.notes,
      })
      .returning();

    for (const line of lines) {
      await tx.insert(orderItems).values({
        orderId: order.id,
        productId: line.productId,
        variantId: line.variantId,
        productNameSnapshot: line.productName,
        skuSnapshot: line.sku,
        variantLabelSnapshot: line.variantLabel,
        unitPrice: line.price,
        quantity: line.quantity,
        discountAmount: (perLineDiscount.get(line.cartItemId) ?? 0).toFixed(2),
        subtotal: round2(Number(line.price) * line.quantity).toFixed(2),
      });

      if (!line.inventoryId) continue;
      await adjustInventoryTx(tx, {
        inventoryId: line.inventoryId,
        type: "sale",
        quantity: -line.quantity,
        referenceType: "order",
        referenceId: order.id,
        actorId: params.profileId,
      });
    }

    if (appliedCouponId) {
      await tx.insert(couponUsages).values({
        couponId: appliedCouponId,
        orderId: order.id,
        profileId: params.profileId,
        discountAmount: discountTotal.toFixed(2),
      });
    }

    await tx.insert(orderAddresses).values({
      orderId: order.id,
      sourceAddressId: params.address.sourceAddressId,
      type: "shipping",
      recipientName: params.address.recipientName,
      phone: params.address.phone,
      line1: params.address.line1,
      line2: params.address.line2,
      cityName: params.address.cityName,
      stateName: params.address.stateName,
      countryName: params.address.countryName,
      postalCode: params.address.postalCode,
    });

    const [payment] = await tx
      .insert(payments)
      .values({
        orderId: order.id,
        paymentMethodId: codMethod.id,
        status: "pending",
        amount: total.toFixed(2),
        currencyCode: DEFAULT_MARKET.currencyCode,
      })
      .returning();

    await tx.insert(paymentTransactions).values({
      paymentId: payment.id,
      provider: "cod",
      type: "order_placed",
      status: "pending",
      amount: total.toFixed(2),
    });

    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: null,
      toStatus: "pending",
      note: "Order placed (Cash on Delivery).",
      changedBy: params.profileId,
    });

    await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    await tx.delete(carts).where(eq(carts.id, cart.id));

    return { order, lines };
  });
}

async function getApplicableTaxRate(tx: DbTransaction, countryId: string, stateId: string | null) {
  const countryRates: TaxRateRow[] = await tx
    .select()
    .from(taxRates)
    .where(and(eq(taxRates.countryId, countryId), eq(taxRates.isActive, true)));

  return selectTaxRate(countryRates, stateId);
}

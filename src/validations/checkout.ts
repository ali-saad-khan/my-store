import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const placeOrderSchema = z
  .object({
    email: z.email("Enter a valid email address."),
    phone: z.string().trim().min(5, "A valid phone number is required.").max(30),
    savedAddressId: z.preprocess(emptyToUndefined, z.uuid().optional()),
    recipientName: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
    cityId: z.preprocess(emptyToUndefined, z.uuid().optional()),
    line1: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
    line2: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
    postalCode: z.preprocess(emptyToUndefined, z.string().trim().max(20).optional()),
    saveAddress: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
    shippingRateId: z.uuid("Select a shipping method."),
    paymentMethodCode: z.literal("cod", {
      error: "Cash on Delivery is the only option right now.",
    }),
    notes: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  })
  .refine((data) => data.savedAddressId ?? (data.recipientName && data.cityId && data.line1), {
    message: "Enter a delivery address.",
    path: ["line1"],
  });

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const addressInputSchema = z.object({
  recipientName: z.string().trim().min(1, "Recipient name is required.").max(200),
  phone: z.string().trim().min(5, "A valid phone number is required.").max(30),
  cityId: z.uuid("Select a city."),
  line1: z.string().trim().min(1, "Address line 1 is required.").max(300),
  line2: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
  postalCode: z.preprocess(emptyToUndefined, z.string().trim().max(20).optional()),
});

export type AddressInput = z.infer<typeof addressInputSchema>;

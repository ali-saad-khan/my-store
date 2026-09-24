import { z } from "zod";
import { orderStatusEnum } from "@/db/schema";

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const orderListSearchSchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(orderStatusEnum.enumValues).optional()),
  page: z.coerce.number().int().min(1).default(1),
});

export const cancelOrderSchema = z.object({
  orderNumber: z.string().trim().min(1),
});

export const updateOrderStatusSchema = z.object({
  orderNumber: z.string().trim().min(1),
  toStatus: z.enum(orderStatusEnum.enumValues),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
});

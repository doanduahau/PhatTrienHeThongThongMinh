import { z } from "zod";
import { PAGINATION } from "../utils/constants.js";

const isoDate = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Ngày không hợp lệ (YYYY-MM-DD)!");

export const revenueQuerySchema = z.object({
  groupBy: z.enum(["day", "month"]).default("day"),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export const topProductsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(10),
});

export const lowStockQuerySchema = z.object({
  threshold: z.coerce.number().int().min(0, "threshold không được âm!").max(1000).default(5),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(20),
});
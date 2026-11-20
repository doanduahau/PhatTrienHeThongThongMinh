import { z } from "zod";
import { PAGINATION } from "../utils/constants.js";
import { dateRangeFields, validateDateRange } from "./dateRange.js";

export const revenueQuerySchema = z.object({
  groupBy: z.enum(["day", "month"]).default("day"),
  ...dateRangeFields,
}).superRefine(validateDateRange);

export const topProductsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(10),
});

export const lowStockQuerySchema = z.object({
  threshold: z.coerce.number().int().min(0, "threshold không được âm!").max(1000).default(5),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(20),
});

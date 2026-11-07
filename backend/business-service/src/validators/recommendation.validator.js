import { z } from "zod";
import { DB_ID_MAX, PAGINATION } from "../utils/constants.js";

const limitField = (defaultValue, max = 50) =>
  z.coerce
    .number()
    .int("limit phải là số nguyên!")
    .min(1, "limit phải >= 1!")
    .max(max, `limit tối đa ${max}!`)
    .default(defaultValue);

export const recommendationLimitSchema = z.object({
  limit: limitField(8),
});

export const cartSuggestionQuerySchema = z.object({
  limit: limitField(6),
});

export const featuredQuerySchema = z.object({
  categoryId: z.coerce
    .number()
    .int("categoryId phải là số nguyên!")
    .positive("categoryId phải lớn hơn 0!")
    .max(DB_ID_MAX, "categoryId không hợp lệ!")
    .optional(),
  limit: limitField(10),
});

export const smartSearchQuerySchema = z.object({
  q: z
    .string({ required_error: "Thiếu từ khoá tìm kiếm!" })
    .trim()
    .min(1, "Từ khoá không được để trống!")
    .max(500, "Từ khoá tối đa 500 ký tự!"),
  page: z.coerce
    .number()
    .int("page phải là số nguyên!")
    .min(1, "page phải >= 1!")
    .max(PAGINATION.MAX_PAGE, `page tối đa ${PAGINATION.MAX_PAGE}!`)
    .default(PAGINATION.DEFAULT_PAGE),
  limit: limitField(20),
});

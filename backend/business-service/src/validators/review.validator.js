import { z } from "zod";
import { DB_ID_MAX, PAGINATION, REVIEW_CONTENT_MAX } from "../utils/constants.js";

export { productIdParamSchema } from "./product.validator.js";

export const createReviewSchema = z.object({
  score: z
    .number({
      required_error: "score là bắt buộc!",
      invalid_type_error: "score phải là số nguyên!",
    })
    .int("score phải là số nguyên!")
    .min(1, "score tối thiểu là 1!")
    .max(5, "score tối đa là 5!"),
  content: z
    .string({ required_error: "Nội dung nhận xét là bắt buộc!" })
    .trim()
    .min(1, "Nội dung nhận xét không được để trống!")
    .max(REVIEW_CONTENT_MAX, `Nội dung nhận xét tối đa ${REVIEW_CONTENT_MAX} ký tự!`),
});

export const reviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(PAGINATION.MAX_PAGE).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
});

export const adminRemoveReviewParamsSchema = z.object({
  productId: z.coerce
    .number({ required_error: "productId là bắt buộc!" })
    .int("productId phải là số nguyên!")
    .positive("productId phải lớn hơn 0!")
    .max(DB_ID_MAX, "productId không hợp lệ!"),
  reviewId: z
    .string({ required_error: "reviewId là bắt buộc!" })
    .trim()
    .min(1, "reviewId không được để trống!")
    .max(20, "reviewId tối đa 20 ký tự!")
    .regex(/^NX-\d{4}$/, "reviewId không hợp lệ!"),
});
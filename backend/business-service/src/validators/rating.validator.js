import { z } from "zod";

export { productIdParamSchema } from "./product.validator.js";

export const rateProductSchema = z.object({
  score: z
    .number({
      required_error: "score là bắt buộc!",
      invalid_type_error: "score phải là số nguyên!",
    })
    .int("score phải là số nguyên!")
    .min(1, "score tối thiểu là 1!")
    .max(5, "score tối đa là 5!"),
});
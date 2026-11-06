import { z } from "zod";
import { MAX_CART_QUANTITY } from "../utils/constants.js";

export const productIdParamSchema = z.object({
  productId: z.coerce
    .number({ invalid_type_error: "productId phải là số!" })
    .int("productId phải là số nguyên!")
    .positive("productId phải lớn hơn 0!"),
});

export const addCartItemSchema = z.object({
  productId: z.coerce
    .number({ required_error: "productId là bắt buộc!" })
    .int("productId phải là số nguyên!")
    .positive("productId phải lớn hơn 0!"),
  quantity: z.coerce.number().int("Số lượng phải là số nguyên!").min(1, "Số lượng tối thiểu là 1!").default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce
    .number({ required_error: "Số lượng là bắt buộc!" })
    .int("Số lượng phải là số nguyên!")
    .min(0, "Số lượng không được âm!")
    .max(MAX_CART_QUANTITY, `Số lượng tối đa ${MAX_CART_QUANTITY}!`),
});

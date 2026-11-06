import { z } from "zod";
import { ORDER_STATUS_VALUES, PAGINATION } from "../utils/constants.js";

export const createOrderSchema = z.object({
  shippingMethodId: z.coerce
    .number({ required_error: "shippingMethodId là bắt buộc!" })
    .int("shippingMethodId phải là số nguyên!")
    .positive("shippingMethodId phải lớn hơn 0!"),
  shippingAddress: z
    .string({ required_error: "Địa chỉ giao hàng là bắt buộc!" })
    .trim()
    .min(5, "Địa chỉ giao hàng phải có ít nhất 5 ký tự!")
    .max(255, "Địa chỉ giao hàng tối đa 255 ký tự!"),
  shippingPhone: z
    .string({ required_error: "Số điện thoại là bắt buộc!" })
    .trim()
    .regex(/^[0-9+\s.-]{8,20}$/, "Số điện thoại không hợp lệ!"),
});

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int("id phải là số nguyên!").positive("id phải lớn hơn 0!"),
});

const pageFields = {
  page: z.coerce.number().int().min(1, "page phải >= 1!").default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1, "limit phải >= 1!")
    .max(PAGINATION.MAX_LIMIT, `limit tối đa ${PAGINATION.MAX_LIMIT}!`)
    .default(PAGINATION.DEFAULT_LIMIT),
};

export const myOrdersQuerySchema = z.object({
  ...pageFields,
  status: z.enum(ORDER_STATUS_VALUES).optional(),
});

const isoDate = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Ngày không hợp lệ (YYYY-MM-DD)!");

export const adminOrdersQuerySchema = z.object({
  ...pageFields,
  status: z.enum(ORDER_STATUS_VALUES).optional(),
  userId: z.coerce.number().int().positive().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES, {
    errorMap: () => ({ message: `status chỉ nhận: ${ORDER_STATUS_VALUES.join(", ")}` }),
  }),
});

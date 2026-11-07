import { z } from "zod";
import { DB_ID_MAX } from "../utils/constants.js";

const name = z
  .string({ required_error: "Tên phương thức là bắt buộc!" })
  .trim()
  .min(1, "Tên phương thức không được để trống!")
  .max(100, "Tên phương thức tối đa 100 ký tự!");

const fee = z.coerce
  .number({ invalid_type_error: "Phí vận chuyển phải là số!" })
  .min(0, "Phí vận chuyển không được âm!");

const estimatedDays = z
  .string()
  .trim()
  .max(50, "Thời gian dự kiến tối đa 50 ký tự!")
  .optional();

const isActive = z.boolean().optional();

export const createShippingSchema = z.object({ name, fee, estimatedDays, isActive });

export const updateShippingSchema = z.object({
  name: name.optional(),
  fee: fee.optional(),
  estimatedDays,
  isActive,
});

export const shippingIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int("id phải là số nguyên!")
    .positive("id phải lớn hơn 0!")
    .max(DB_ID_MAX, "id không hợp lệ!"),
});

import { z } from "zod";
import { DB_ID_MAX } from "../utils/constants.js";

const name = z
  .string({ required_error: "Tên thương hiệu là bắt buộc!" })
  .trim()
  .min(1, "Tên thương hiệu không được để trống!")
  .max(100, "Tên thương hiệu tối đa 100 ký tự!");

export const createBrandSchema = z.object({ name });

export const updateBrandSchema = z.object({ name: name.optional() });

export const brandIdParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: "id phải là số!" })
    .int("id phải là số nguyên!")
    .positive("id phải lớn hơn 0!")
    .max(DB_ID_MAX, "id không hợp lệ!"),
});

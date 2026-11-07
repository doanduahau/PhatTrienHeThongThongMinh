import { z } from "zod";
import { DB_ID_MAX } from "../utils/constants.js";

const name = z
  .string({ required_error: "Tên danh mục là bắt buộc!" })
  .trim()
  .min(1, "Tên danh mục không được để trống!")
  .max(100, "Tên danh mục tối đa 100 ký tự!");

const slug = z
  .string({ required_error: "Slug danh mục là bắt buộc!" })
  .trim()
  .min(2, "Slug phải có ít nhất 2 ký tự!")
  .max(50, "Slug tối đa 50 ký tự!")
  .regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang!");

export const createCategorySchema = z.object({ name, slug });

export const updateCategorySchema = z.object({ name: name.optional(), slug: slug.optional() });

export const categoryIdParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: "id phải là số!" })
    .int("id phải là số nguyên!")
    .positive("id phải lớn hơn 0!")
    .max(DB_ID_MAX, "id không hợp lệ!"),
});

import { z } from "zod";
import { DB_ID_MAX, PAGINATION, PRODUCT_DETAIL_SLUGS } from "../utils/constants.js";
import { imageUrlSchema } from "./image.validator.js";

const connectivity3 = z.enum(["wired", "wireless", "tri_mode"], {
  errorMap: () => ({ message: "connectivity chỉ nhận: wired, wireless, tri_mode" }),
});

/* ------------------------------ Sản phẩm nền ------------------------------ */

// Bỏ thuộc tính = giữ nguyên; gửi chuỗi rỗng/null/boolean = lỗi, không chuyển thành 0.
const optionalFormNumber = (schema) => z.preprocess((value) => {
  if (value === undefined || typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}, schema.optional());

const brandIdField = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return undefined;
    return Number(value);
  },
  z
    .number({
      required_error: "brandId là bắt buộc!",
      invalid_type_error: "brandId phải là số!",
    })
    .int("brandId phải là số nguyên!")
    .positive("brandId phải lớn hơn 0!")
    .max(DB_ID_MAX, "brandId không hợp lệ!"),
);

const baseProductFields = {
  categoryId: z.coerce
    .number({ required_error: "categoryId là bắt buộc!" })
    .int("categoryId phải là số nguyên!")
    .positive("categoryId phải lớn hơn 0!")
    .max(DB_ID_MAX, "categoryId không hợp lệ!"),
  brandId: brandIdField,
  name: z
    .string({ required_error: "Tên sản phẩm là bắt buộc!" })
    .trim()
    .min(1, "Tên sản phẩm không được để trống!")
    .max(255, "Tên sản phẩm tối đa 255 ký tự!"),
  color: z.string().trim().max(50, "Màu sắc tối đa 50 ký tự!").optional(),
  stockQuantity: optionalFormNumber(z.number()
    .int("Số lượng tồn kho phải là số nguyên!")
    .min(0, "Tồn kho không được âm!")
    .max(DB_ID_MAX, "Tồn kho vượt giới hạn cho phép!")),
  imageUrl: imageUrlSchema,
  price: optionalFormNumber(z.number().finite().min(0, "Giá không được âm!").max(9999999999999.99, "Giá vượt giới hạn cho phép!")),
  // Không nhận rating từ admin: điểm do khách hàng vote, tự tính trong rating.service.js
};

const detailField = { detail: z.any().optional() };

// Giống shipping.validator: chỉ nhận boolean thật, không suy ra từ chuỗi.
const isActive = z.boolean().optional();

export const createProductSchema = z.object({
  categoryId: baseProductFields.categoryId,
  brandId: baseProductFields.brandId,
  name: baseProductFields.name,
  color: baseProductFields.color,
  stockQuantity: baseProductFields.stockQuantity,
  imageUrl: baseProductFields.imageUrl,
  price: baseProductFields.price,
  isActive,
  ...detailField,
});

export const updateProductSchema = z.object({
  categoryId: baseProductFields.categoryId.optional(),
  brandId: baseProductFields.brandId.optional(),
  name: baseProductFields.name.optional(),
  color: baseProductFields.color,
  stockQuantity: baseProductFields.stockQuantity,
  imageUrl: baseProductFields.imageUrl.optional(),
  price: baseProductFields.price,
  isActive,
  ...detailField,
});

export const productQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1, "page phải >= 1!")
    .max(PAGINATION.MAX_PAGE, `page tối đa ${PAGINATION.MAX_PAGE}!`)
    .default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1, "limit phải >= 1!")
    .max(PAGINATION.MAX_LIMIT, `limit tối đa ${PAGINATION.MAX_LIMIT}!`)
    .default(PAGINATION.DEFAULT_LIMIT),
  categoryId: z.coerce
    .number()
    .int()
    .positive("categoryId phải lớn hơn 0!")
    .max(DB_ID_MAX, "categoryId không hợp lệ!")
    .optional(),
  brandId: z.coerce
    .number()
    .int()
    .positive("brandId phải lớn hơn 0!")
    .max(DB_ID_MAX, "brandId không hợp lệ!")
    .optional(),
  brand: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  // "all"/"false" chỉ có tác dụng với token admin (controller chặn khách), xem product.controller.js
  isActive: z.enum(["all", "true", "false"]).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name_asc", "rating_desc"]).default("newest"),
  inStock: z.union([z.string(), z.boolean()]).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  connectivity: z.string().trim().optional(),
  handOrientation: z.string().trim().optional(),
  minWeight: z.coerce.number().optional(),
  maxWeight: z.coerce.number().optional(),
  pollingRate: z.coerce.number().optional(),
  switchType: z.string().trim().optional(),
  layout: z.string().trim().optional(),
  hasRapidTrigger: z.union([z.string(), z.boolean()]).optional(),
  hasHotswap: z.union([z.string(), z.boolean()]).optional(),
  supportMacos: z.union([z.string(), z.boolean()]).optional(),
  headphoneType: z.string().trim().optional(),
  hasMic: z.union([z.string(), z.boolean()]).optional(),
  hasAnc: z.union([z.string(), z.boolean()]).optional(),
  padType: z.string().trim().optional(),
  mouseControl: z.string().trim().optional(),
  base: z.string().trim().optional(),
  size: z.string().trim().optional(),
  surface: z.string().trim().optional(),
  speed: z.string().trim().optional(),
  setupCategory: z.string().trim().optional(),
  maxLoadKg: z.coerce.number().optional(),
}).passthrough();

export const productIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int("id phải là số nguyên!")
    .positive("id phải lớn hơn 0!")
    .max(DB_ID_MAX, "id không hợp lệ!"),
});

/* --------------------- Thông số chi tiết theo từng loại ------------------- */

const pollingRate = z.coerce
  .number()
  .int()
  .min(125, "Polling rate tối thiểu 125Hz!")
  .max(8000, "Polling rate tối đa 8000Hz!")
  .optional();

export const mouseDetailSchema = z.object({
  connectivity: connectivity3,
  handOrientation: z.enum(["symmetrical", "ergonomic"], {
    errorMap: () => ({ message: "handOrientation chỉ nhận: symmetrical, ergonomic" }),
  }),
  weightG: z.coerce.number().gt(0, "Trọng lượng phải lớn hơn 0!").max(999.9, "Trọng lượng tối đa 999.9g!"),
  pollingRateHz: pollingRate,
  switchType: z.string().trim().max(100).optional(),
  sensor: z.string().trim().max(100).optional(),
});

export const keyboardDetailSchema = z.object({
  connectivity: connectivity3,
  layout: z.enum(["60%", "65%", "75%", "TKL", "Fullsize"], {
    errorMap: () => ({ message: "layout chỉ nhận: 60%, 65%, 75%, TKL, Fullsize" }),
  }),
  hasRapidTrigger: z.boolean().optional(),
  hasHotswap: z.boolean().optional(),
  supportMacos: z.boolean().optional(),
  pollingRateHz: pollingRate,
  switch: z.string().trim().max(100).optional(),
});

export const headphoneDetailSchema = z.object({
  connectivity: z.enum(["wired_3.5mm", "wireless_2.4g", "bluetooth"], {
    errorMap: () => ({ message: "connectivity chỉ nhận: wired_3.5mm, wireless_2.4g, bluetooth" }),
  }),
  headphoneType: z.enum(["in_ear", "over_ear", "on_ear", "soundcard"], {
    errorMap: () => ({ message: "headphoneType chỉ nhận: in_ear, over_ear, on_ear, soundcard" }),
  }),
  hasMic: z.boolean().optional(),
  hasAnc: z.boolean().optional(),
});

export const setupDetailSchema = z.object({
  setupCategory: z.enum(["chair", "desk", "arm", "accessory"], {
    errorMap: () => ({ message: "setupCategory chỉ nhận: chair, desk, arm, accessory" }),
  }),
  maxLoadKg: z.coerce.number().int("maxLoadKg phải là số nguyên!").min(0, "maxLoadKg không được âm!").optional(),
});

export const mousepadDetailSchema = z.object({
  padType: z.string().trim().max(50).optional(),
  mouseControl: z.string().trim().max(50).optional(),
  speed: z.string().trim().max(50).optional(),
  surface: z.string().trim().max(100).optional(),
  base: z.string().trim().max(100).optional(),
  size: z.string().trim().max(50).optional(),
});

/** Map slug danh mục -> schema thông số chi tiết */
export const detailSchemas = {
  [PRODUCT_DETAIL_SLUGS.MOUSE]: mouseDetailSchema,
  [PRODUCT_DETAIL_SLUGS.KEYBOARD]: keyboardDetailSchema,
  [PRODUCT_DETAIL_SLUGS.HEADPHONE]: headphoneDetailSchema,
  [PRODUCT_DETAIL_SLUGS.SOUNDCARD]: headphoneDetailSchema,
  [PRODUCT_DETAIL_SLUGS.MOUSEPAD]: mousepadDetailSchema,
  [PRODUCT_DETAIL_SLUGS.SETUP]: setupDetailSchema,
  [PRODUCT_DETAIL_SLUGS.CHAIR]: setupDetailSchema,
  [PRODUCT_DETAIL_SLUGS.DESK]: setupDetailSchema,
  [PRODUCT_DETAIL_SLUGS.ARM]: setupDetailSchema,
  [PRODUCT_DETAIL_SLUGS.ERGONOMIC_ACCESSORY]: setupDetailSchema,
};

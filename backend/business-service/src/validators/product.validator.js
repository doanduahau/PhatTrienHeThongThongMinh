import { z } from "zod";
import { DB_ID_MAX, PAGINATION, PRODUCT_DETAIL_SLUGS } from "../utils/constants.js";

const connectivity3 = z.enum(["wired", "wireless", "tri_mode"], {
  errorMap: () => ({ message: "connectivity chỉ nhận: wired, wireless, tri_mode" }),
});

/* ------------------------------ Sản phẩm nền ------------------------------ */

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
  stockQuantity: z.coerce
    .number()
    .int("Số lượng tồn kho phải là số nguyên!")
    .min(0, "Tồn kho không được âm!")
    .optional(),
  imageUrl: z
    .string({ required_error: "Ảnh sản phẩm là bắt buộc!" })
    .trim()
    .url("imageUrl phải là URL hợp lệ!"),
  price: z.coerce.number({ required_error: "Giá là bắt buộc!" }).min(0, "Giá không được âm!").optional(),
  rating: z.coerce.number().min(0, "Đánh giá thấp nhất là 0!").max(5, "Đánh giá cao nhất là 5!").optional(),
};

const detailField = { detail: z.any().optional() };

export const createProductSchema = z.object({
  categoryId: baseProductFields.categoryId,
  brandId: baseProductFields.brandId,
  name: baseProductFields.name,
  color: baseProductFields.color,
  stockQuantity: baseProductFields.stockQuantity,
  imageUrl: baseProductFields.imageUrl,
  price: baseProductFields.price,
  rating: baseProductFields.rating,
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
  rating: baseProductFields.rating,
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
  sort: z.enum(["newest", "price_asc", "price_desc", "name_asc", "rating_desc"]).default("newest"),
});

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

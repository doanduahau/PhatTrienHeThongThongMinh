import { Prisma } from "@prisma/client";
import { AppError } from "./AppError.js";
import { detailSchemas } from "../validators/product.validator.js";
import { toFieldErrors } from "../validators/validate.js";

/**
 * Map slug danh mục -> tên delegate Prisma của bảng chi tiết tương ứng.
 * Hỗ trợ đầy đủ 9 danh mục trên Supabase + slug "setup" tổng quát.
 */
const DETAIL_MODELS = Object.freeze({
  "chuot": "mouse",
  "ban-phim": "keyboard",
  "tai-nghe": "headphone",
  "soundcard": "headphone",
  "lot-chuot": "mousepad",
  "setup": "setup",
  "ghe": "setup",
  "ban": "setup",
  "arm-man-hinh": "setup",
  "phu-kien-cong-thai-hoc": "setup",
});

export const getDetailModel = (slug) => DETAIL_MODELS[slug] ?? null;

/**
 * Validate thông số chi tiết theo slug.
 * Trả { model, data } hoặc null nếu danh mục không có bảng chi tiết.
 * Thương hiệu nằm ở products.brand_id, không lưu trong bảng chi tiết.
 */
export const parseDetail = (slug, detail) => {
  const model = getDetailModel(slug);
  if (!model) return null;

  const schema = detailSchemas[slug];
  if (!schema) return null;

  if (detail === undefined || detail === null) {
    throw new AppError("Danh mục này yêu cầu thông số chi tiết sản phẩm!", {
      data: { slug },
    });
  }

  const result = schema.safeParse(detail);
  if (!result.success) {
    throw new AppError("Thông số chi tiết sản phẩm không hợp lệ!", {
      data: toFieldErrors(result.error),
    });
  }

  return { model, data: result.data };
};

/** Loại bỏ các giá trị null/rỗng không cần thiết trước khi ghi Prisma */
export const toPrismaDecimal = (value) => new Prisma.Decimal(value);

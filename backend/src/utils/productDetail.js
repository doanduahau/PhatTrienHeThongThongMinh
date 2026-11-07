import { Prisma } from "@prisma/client";
import { AppError } from "./AppError.js";
import { detailSchemas } from "../validators/product.validator.js";
import { toFieldErrors } from "../validators/validate.js";

/**
 * Map slug danh mục -> tên delegate Prisma của bảng chi tiết tương ứng.
 * Một chỗ duy nhất, không tách service riêng cho từng loại sản phẩm.
 */
const DETAIL_MODELS = Object.freeze({
  "chuot": "mouse",
  "ban-phim": "keyboard",
  "tai-nghe": "headphone",
  "lot-chuot": "mousepad",
  "setup": "setup",
});

export const getDetailModel = (slug) => DETAIL_MODELS[slug] ?? null;

/**
 * Validate thông số chi tiết theo slug.
 * Trả { model, data } hoặc null nếu danh mục không có bảng chi tiết.
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

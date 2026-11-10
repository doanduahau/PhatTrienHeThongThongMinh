import { z } from "zod";

/** Mã khoá chính dạng PREFIX-XXXX, ví dụ VC-0001. */
export const idCode = (prefix, label) =>
  z
    .string({
      required_error: `${label} là bắt buộc!`,
      invalid_type_error: `${label} không hợp lệ (định dạng ${prefix}-XXXX)!`,
    })
    .trim()
    .regex(new RegExp(`^${prefix}-\\d{4,}$`), `${label} không hợp lệ (định dạng ${prefix}-XXXX)!`);
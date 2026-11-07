import { z } from "zod";
import { DB_ID_MAX, PAGINATION, ROLES } from "../utils/constants.js";

export const adminUsersQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_PAGE)
    .default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  search: z.string().trim().min(1).optional(),
  role: z.enum(Object.values(ROLES)).optional(),
  isLocked: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

export const userIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int("id phải là số nguyên!")
    .positive("id phải lớn hơn 0!")
    .max(DB_ID_MAX, "id không hợp lệ!"),
});

export const setUserLockSchema = z.object({
  isLocked: z.boolean({
    required_error: "isLocked là bắt buộc!",
    invalid_type_error: "isLocked phải là true/false!",
  }),
});

export const setUserRoleSchema = z.object({
  role: z.enum(Object.values(ROLES), {
    errorMap: () => ({ message: `role chỉ nhận: ${Object.values(ROLES).join(", ")}` }),
  }),
});
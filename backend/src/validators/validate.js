/**
 * Bọc Zod cho Controller: luôn trả object thống nhất, không ném exception.
 */
export const validateInput = (schema, data) => {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    };
  }

  return { success: true, data: result.data };
};

/** Chuyển lỗi Zod thành mảng { field, message } để trả kèm sendError */
export const toFieldErrors = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));

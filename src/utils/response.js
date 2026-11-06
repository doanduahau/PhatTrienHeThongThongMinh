/**
 * Trả về kết quả thành công kèm dữ liệu (thêm, sửa, xóa, lấy danh sách)
 */
export const sendSuccess = (res, data = null, message = "Thao tác thành công!") => {
  return res.status(200).json({
    status: "200",
    message,
    data,
  });
};

/**
 * Trả về thông báo lỗi kèm mã trạng thái
 */
export const sendError = (res, message = "Đã xảy ra lỗi!", status = "400", data = null, httpStatus = 200) => {
  return res.status(httpStatus).json({
    status: String(status),
    message,
    data,
  });
};

/**
 * Lọc bỏ các thuộc tính undefined trước khi cập nhật CSDL
 */
export const removeUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, val]) => val !== undefined));

/**
 * Chuyển lỗi bắt được trong Controller thành response thống nhất.
 * Lỗi nghiệp vụ (AppError) giữ nguyên mã; lỗi Prisma quy về thông báo đọc được.
 */
export const sendAppError = (res, error, fallbackMessage = "Thao tác thất bại!") => {
  if (error?.isAppError) {
    return sendError(res, error.message, error.status, error.data, error.httpStatus);
  }

  if (error?.code === "P2025") {
    return sendError(res, "Không tìm thấy dữ liệu!", "404", null, 404);
  }

  if (error?.code === "P2002") {
    return sendError(res, "Dữ liệu đã tồn tại!", "400", error.meta, 400);
  }

  if (error?.code === "P2003") {
    return sendError(res, "Dữ liệu đang được sử dụng ở nơi khác, không thể thay đổi!", "400", null, 400);
  }

  console.error("[SERVICE ERROR]", error);
  return sendError(res, fallbackMessage, "400", error.message, 400);
};

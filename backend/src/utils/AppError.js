/**
 * Lỗi nghiệp vụ có ngữ nghĩa HTTP.
 * Service ném AppError, Controller bắt và chuyển thành sendError.
 */
export class AppError extends Error {
  constructor(message, { status = "400", httpStatus = 400, data = null } = {}) {
    super(message);
    this.name = "AppError";
    this.status = String(status);
    this.httpStatus = httpStatus;
    this.data = data;
    this.isAppError = true;
  }
}

export const notFound = (message = "Không tìm thấy dữ liệu!") =>
  new AppError(message, { status: "404", httpStatus: 404 });

export const badRequest = (message = "Dữ liệu không hợp lệ!", data = null) =>
  new AppError(message, { status: "400", httpStatus: 400, data });

export const forbidden = (message = "Bạn không có quyền thực hiện thao tác này!") =>
  new AppError(message, { status: "403", httpStatus: 403 });

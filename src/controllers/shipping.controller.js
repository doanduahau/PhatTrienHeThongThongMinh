import * as shippingService from "../services/shipping.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import { validateInput } from "../validators/validate.js";
import {
  createShippingSchema,
  updateShippingSchema,
  shippingIdParamSchema,
} from "../validators/shipping.validator.js";

export const getAll = async (req, res) => {
  // Khách chỉ thấy phương thức đang hoạt động; admin xem tất cả
  const onlyActive = req.user?.role !== "admin";
  try {
    const data = await shippingService.getAll({ onlyActive });
    return sendSuccess(res, data, "Lấy danh sách phương thức vận chuyển thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy danh sách phương thức vận chuyển thất bại!");
  }
};

export const create = async (req, res) => {
  const validation = validateInput(createShippingSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await shippingService.create(validation.data);
    return sendSuccess(res, data, "Thêm phương thức vận chuyển thành công!");
  } catch (error) {
    return sendAppError(res, error, "Thêm phương thức vận chuyển thất bại!");
  }
};

export const update = async (req, res) => {
  const params = validateInput(shippingIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  const validation = validateInput(updateShippingSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await shippingService.update(params.data.id, validation.data);
    return sendSuccess(res, data, "Cập nhật phương thức vận chuyển thành công!");
  } catch (error) {
    return sendAppError(res, error, "Cập nhật phương thức vận chuyển thất bại!");
  }
};

export const remove = async (req, res) => {
  const params = validateInput(shippingIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  try {
    await shippingService.remove(params.data.id);
    return sendSuccess(res, null, "Xoá phương thức vận chuyển thành công!");
  } catch (error) {
    return sendAppError(res, error, "Xoá phương thức vận chuyển thất bại!");
  }
};

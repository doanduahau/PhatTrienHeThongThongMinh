import * as brandService from "../services/brand.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import { validateInput } from "../validators/validate.js";
import {
  createBrandSchema,
  updateBrandSchema,
  brandIdParamSchema,
} from "../validators/brand.validator.js";

export const getAll = async (_req, res) => {
  try {
    const data = await brandService.getAll();
    return sendSuccess(res, data, "Lấy danh sách thương hiệu thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy danh sách thương hiệu thất bại!");
  }
};

export const getById = async (req, res) => {
  const params = validateInput(brandIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  try {
    const data = await brandService.getById(params.data.id);
    if (!data) return sendError(res, "Không tìm thấy thương hiệu!", "404", null, 404);
    return sendSuccess(res, data, "Lấy chi tiết thương hiệu thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy chi tiết thương hiệu thất bại!");
  }
};

export const create = async (req, res) => {
  const validation = validateInput(createBrandSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await brandService.create(validation.data);
    return sendSuccess(res, data, "Thêm thương hiệu thành công!");
  } catch (error) {
    return sendAppError(res, error, "Thêm thương hiệu thất bại!");
  }
};

export const update = async (req, res) => {
  const params = validateInput(brandIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  const validation = validateInput(updateBrandSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await brandService.update(params.data.id, validation.data);
    return sendSuccess(res, data, "Cập nhật thương hiệu thành công!");
  } catch (error) {
    return sendAppError(res, error, "Cập nhật thương hiệu thất bại!");
  }
};

export const remove = async (req, res) => {
  const params = validateInput(brandIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  try {
    await brandService.remove(params.data.id);
    return sendSuccess(res, null, "Xoá thương hiệu thành công!");
  } catch (error) {
    return sendAppError(res, error, "Xoá thương hiệu thất bại!");
  }
};

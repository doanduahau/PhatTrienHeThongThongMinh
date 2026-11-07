import * as productService from "../services/product.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import { validateInput } from "../validators/validate.js";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  productIdParamSchema,
} from "../validators/product.validator.js";

export const getAll = async (req, res) => {
  const validation = validateInput(productQuerySchema, req.query);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await productService.getAll(validation.data);
    return sendSuccess(res, data, "Lấy danh sách sản phẩm thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy danh sách sản phẩm thất bại!");
  }
};

export const getById = async (req, res) => {
  const params = validateInput(productIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  try {
    const data = await productService.getById(params.data.id);
    return sendSuccess(res, data, "Lấy chi tiết sản phẩm thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy chi tiết sản phẩm thất bại!");
  }
};

export const create = async (req, res) => {
  const validation = validateInput(createProductSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await productService.create(validation.data);
    return sendSuccess(res, data, "Thêm sản phẩm thành công!");
  } catch (error) {
    return sendAppError(res, error, "Thêm sản phẩm thất bại!");
  }
};

export const update = async (req, res) => {
  const params = validateInput(productIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  const validation = validateInput(updateProductSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await productService.update(params.data.id, validation.data);
    return sendSuccess(res, data, "Cập nhật sản phẩm thành công!");
  } catch (error) {
    return sendAppError(res, error, "Cập nhật sản phẩm thất bại!");
  }
};

export const remove = async (req, res) => {
  const params = validateInput(productIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  try {
    await productService.remove(params.data.id);
    return sendSuccess(res, null, "Xoá sản phẩm thành công!");
  } catch (error) {
    return sendAppError(res, error, "Xoá sản phẩm thất bại!");
  }
};

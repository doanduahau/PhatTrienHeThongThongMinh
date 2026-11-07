import * as categoryService from "../services/category.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import { validateInput } from "../validators/validate.js";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from "../validators/category.validator.js";

export const getAll = async (_req, res) => {
  try {
    const data = await categoryService.getAll();
    return sendSuccess(res, data, "Lấy danh sách danh mục thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy danh sách danh mục thất bại!");
  }
};

export const create = async (req, res) => {
  const validation = validateInput(createCategorySchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await categoryService.create(validation.data);
    return sendSuccess(res, data, "Thêm danh mục thành công!");
  } catch (error) {
    return sendAppError(res, error, "Thêm danh mục thất bại!");
  }
};

export const update = async (req, res) => {
  const params = validateInput(categoryIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  const validation = validateInput(updateCategorySchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await categoryService.update(params.data.id, validation.data);
    return sendSuccess(res, data, "Cập nhật danh mục thành công!");
  } catch (error) {
    return sendAppError(res, error, "Cập nhật danh mục thất bại!");
  }
};

export const remove = async (req, res) => {
  const params = validateInput(categoryIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  try {
    await categoryService.remove(params.data.id);
    return sendSuccess(res, null, "Xoá danh mục thành công!");
  } catch (error) {
    return sendAppError(res, error, "Xoá danh mục thất bại!");
  }
};

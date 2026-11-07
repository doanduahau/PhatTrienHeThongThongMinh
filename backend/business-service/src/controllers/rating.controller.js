import * as ratingService from "../services/rating.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import { validateInput } from "../validators/validate.js";
import { productIdParamSchema, rateProductSchema } from "../validators/rating.validator.js";

export const getSummary = async (req, res) => {
  const params = validateInput(productIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  try {
    const data = await ratingService.getSummary(params.data.id);
    return sendSuccess(res, data, "Lấy đánh giá sản phẩm thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy đánh giá sản phẩm thất bại!");
  }
};

export const rateProduct = async (req, res) => {
  const params = validateInput(productIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  const validation = validateInput(rateProductSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await ratingService.rateProduct(req.user.id, params.data.id, validation.data.score);
    return sendSuccess(res, data, "Đánh giá sản phẩm thành công!");
  } catch (error) {
    return sendAppError(res, error, "Đánh giá sản phẩm thất bại!");
  }
};

export const removeRating = async (req, res) => {
  const params = validateInput(productIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  try {
    const data = await ratingService.removeRating(req.user.id, params.data.id);
    return sendSuccess(res, data, "Xoá đánh giá thành công!");
  } catch (error) {
    return sendAppError(res, error, "Xoá đánh giá thất bại!");
  }
};
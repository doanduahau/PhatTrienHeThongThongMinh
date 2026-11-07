import * as reviewService from "../services/review.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import { validateInput } from "../validators/validate.js";
import {
  productIdParamSchema,
  createReviewSchema,
  reviewQuerySchema,
} from "../validators/review.validator.js";

export const createOrUpdate = async (req, res) => {
  const params = validateInput(productIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  const validation = validateInput(createReviewSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await reviewService.createOrUpdate(req.user.id, params.data.id, validation.data);
    return sendSuccess(res, data, "Gửi nhận xét thành công!");
  } catch (error) {
    return sendAppError(res, error, "Gửi nhận xét thất bại!");
  }
};

export const getReviews = async (req, res) => {
  const params = validateInput(productIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  const validation = validateInput(reviewQuerySchema, req.query);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await reviewService.getReviews(params.data.id, validation.data);
    return sendSuccess(res, data, "Lấy danh sách nhận xét thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy danh sách nhận xét thất bại!");
  }
};

export const removeReview = async (req, res) => {
  const params = validateInput(productIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  try {
    const data = await reviewService.removeReview(req.user.id, params.data.id);
    return sendSuccess(res, data, "Xoá nhận xét thành công!");
  } catch (error) {
    return sendAppError(res, error, "Xoá nhận xét thất bại!");
  }
};
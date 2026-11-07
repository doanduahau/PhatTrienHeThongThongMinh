import * as recommendationService from "../services/recommendation.service.js";
import * as smartSearchService from "../services/smartSearch.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import { validateInput } from "../validators/validate.js";
import { productIdParamSchema } from "../validators/product.validator.js";
import {
  cartSuggestionQuerySchema,
  featuredQuerySchema,
  recommendationLimitSchema,
  smartSearchQuerySchema,
} from "../validators/recommendation.validator.js";

const validateOrReject = (res, schema, input) => {
  const result = validateInput(schema, input);
  if (!result.success) {
    sendError(res, "Dữ liệu không hợp lệ!", "400", result.errors, 400);
    return null;
  }
  return result.data;
};

export const getSimilar = async (req, res) => {
  const params = validateOrReject(res, productIdParamSchema, req.params);
  if (!params) return;

  const query = validateOrReject(res, recommendationLimitSchema, req.query);
  if (!query) return;

  try {
    const data = await recommendationService.getSimilarProducts(params.id, query.limit);
    return sendSuccess(res, data, "Lấy sản phẩm tương tự thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy sản phẩm tương tự thất bại!");
  }
};

export const getCartSuggestions = async (req, res) => {
  const query = validateOrReject(res, cartSuggestionQuerySchema, req.query);
  if (!query) return;

  try {
    const data = await recommendationService.getCartSuggestions(req.user.id, query.limit);
    return sendSuccess(res, data, "Lấy gợi ý mua kèm thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy gợi ý mua kèm thất bại!");
  }
};

export const getForYou = async (req, res) => {
  const query = validateOrReject(res, recommendationLimitSchema, req.query);
  if (!query) return;

  try {
    const data = await recommendationService.getForYou(req.user.id, query.limit);
    return sendSuccess(res, data, "Lấy gợi ý cá nhân hóa thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy gợi ý cá nhân hóa thất bại!");
  }
};

export const getFeatured = async (req, res) => {
  const query = validateOrReject(res, featuredQuerySchema, req.query);
  if (!query) return;

  try {
    const data = await recommendationService.getFeaturedProducts(query.categoryId, query.limit);
    return sendSuccess(res, data, "Lấy sản phẩm nổi bật thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy sản phẩm nổi bật thất bại!");
  }
};

export const smartSearch = async (req, res) => {
  const query = validateOrReject(res, smartSearchQuerySchema, req.query);
  if (!query) return;

  try {
    const data = await smartSearchService.smartSearch(query.q, {
      page: query.page,
      limit: query.limit,
    });
    return sendSuccess(res, data, "Tìm kiếm thông minh thành công!");
  } catch (error) {
    return sendAppError(res, error, "Tìm kiếm thông minh thất bại!");
  }
};

export const getMlStatus = async (_req, res) => {
  try {
    const data = await recommendationService.getMlStatus();
    return sendSuccess(res, data, "Lấy trạng thái ML service thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy trạng thái ML service thất bại!");
  }
};

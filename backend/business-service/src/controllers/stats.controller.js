import * as statsService from "../services/stats.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import { validateInput } from "../validators/validate.js";
import {
  revenueQuerySchema,
  topProductsQuerySchema,
  lowStockQuerySchema,
} from "../validators/stats.validator.js";

export const getOverview = async (_req, res) => {
  try {
    const data = await statsService.getOverview();
    return sendSuccess(res, data, "Lấy thống kê tổng quan thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy thống kê tổng quan thất bại!");
  }
};

export const getRevenue = async (req, res) => {
  const validation = validateInput(revenueQuerySchema, req.query);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await statsService.getRevenue(validation.data);
    return sendSuccess(res, data, "Lấy thống kê doanh thu thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy thống kê doanh thu thất bại!");
  }
};

export const getTopProducts = async (req, res) => {
  const validation = validateInput(topProductsQuerySchema, req.query);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await statsService.getTopProducts(validation.data.limit);
    return sendSuccess(res, data, "Lấy top sản phẩm bán chạy thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy top sản phẩm bán chạy thất bại!");
  }
};

export const getLowStock = async (req, res) => {
  const validation = validateInput(lowStockQuerySchema, req.query);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await statsService.getLowStock(validation.data);
    return sendSuccess(res, data, "Lấy danh sách sắp hết hàng thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy danh sách sắp hết hàng thất bại!");
  }
};
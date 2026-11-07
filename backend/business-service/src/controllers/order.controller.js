import * as orderService from "../services/order.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import { validateInput } from "../validators/validate.js";
import {
  createOrderSchema,
  orderIdParamSchema,
  myOrdersQuerySchema,
  adminOrdersQuerySchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
} from "../validators/order.validator.js";

export const checkout = async (req, res) => {
  const validation = validateInput(createOrderSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await orderService.checkout(req.user.id, validation.data);
    return sendSuccess(res, data, "Đặt hàng thành công!");
  } catch (error) {
    return sendAppError(res, error, "Đặt hàng thất bại!");
  }
};

export const getMyOrders = async (req, res) => {
  const validation = validateInput(myOrdersQuerySchema, req.query);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await orderService.getMyOrders(req.user.id, validation.data);
    return sendSuccess(res, data, "Lấy danh sách đơn hàng thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy danh sách đơn hàng thất bại!");
  }
};

export const getMyOrderById = async (req, res) => {
  const params = validateInput(orderIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  try {
    const data = await orderService.getMyOrderById(req.user.id, params.data.id);
    return sendSuccess(res, data, "Lấy chi tiết đơn hàng thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy chi tiết đơn hàng thất bại!");
  }
};

export const cancelMyOrder = async (req, res) => {
  const params = validateInput(orderIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  try {
    const data = await orderService.cancelMyOrder(req.user.id, params.data.id);
    return sendSuccess(res, data, "Huỷ đơn hàng thành công!");
  } catch (error) {
    return sendAppError(res, error, "Huỷ đơn hàng thất bại!");
  }
};

export const getAllOrders = async (req, res) => {
  const validation = validateInput(adminOrdersQuerySchema, req.query);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await orderService.getAllOrders(validation.data);
    return sendSuccess(res, data, "Lấy danh sách đơn hàng thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy danh sách đơn hàng thất bại!");
  }
};

export const updateStatus = async (req, res) => {
  const params = validateInput(orderIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  const validation = validateInput(updateOrderStatusSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await orderService.updateStatusByAdmin(params.data.id, validation.data.status, req.user);
    return sendSuccess(res, data, "Cập nhật trạng thái đơn hàng thành công!");
  } catch (error) {
    return sendAppError(res, error, "Cập nhật trạng thái đơn hàng thất bại!");
  }
};

export const updatePaymentStatus = async (req, res) => {
  const params = validateInput(orderIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  const validation = validateInput(updatePaymentStatusSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await orderService.updatePaymentStatusByAdmin(params.data.id, validation.data.paymentStatus);
    return sendSuccess(res, data, "Cập nhật thanh toán thành công!");
  } catch (error) {
    return sendAppError(res, error, "Cập nhật thanh toán thất bại!");
  }
};

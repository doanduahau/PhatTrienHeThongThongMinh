import * as cartService from "../services/cart.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import { validateInput } from "../validators/validate.js";
import {
  addCartItemSchema,
  updateCartItemSchema,
  productIdParamSchema,
} from "../validators/cart.validator.js";

export const getCart = async (req, res) => {
  try {
    const data = await cartService.getCart(req.user.id);
    return sendSuccess(res, data, "Lấy giỏ hàng thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy giỏ hàng thất bại!");
  }
};

export const addItem = async (req, res) => {
  const validation = validateInput(addCartItemSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const item = await cartService.addItem(req.user.id, validation.data);
    return sendSuccess(res, item, "Thêm sản phẩm vào giỏ hàng thành công!");
  } catch (error) {
    return sendAppError(res, error, "Thêm sản phẩm vào giỏ hàng thất bại!");
  }
};

export const updateItem = async (req, res) => {
  const params = validateInput(productIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  const validation = validateInput(updateCartItemSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await cartService.updateItem(req.user.id, params.data.productId, validation.data.quantity);
    return sendSuccess(res, data, "Cập nhật giỏ hàng thành công!");
  } catch (error) {
    return sendAppError(res, error, "Cập nhật giỏ hàng thất bại!");
  }
};

export const removeItem = async (req, res) => {
  const params = validateInput(productIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  try {
    const data = await cartService.removeItem(req.user.id, params.data.productId);
    return sendSuccess(res, data, "Xoá sản phẩm khỏi giỏ hàng thành công!");
  } catch (error) {
    return sendAppError(res, error, "Xoá sản phẩm khỏi giỏ hàng thất bại!");
  }
};

export const clear = async (req, res) => {
  try {
    const data = await cartService.clearCart(req.user.id);
    return sendSuccess(res, data, "Xoá toàn bộ giỏ hàng thành công!");
  } catch (error) {
    return sendAppError(res, error, "Xoá giỏ hàng thất bại!");
  }
};

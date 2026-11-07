import * as paymentService from "../services/payment.service.js";
import { sendSuccess, sendAppError } from "../utils/response.js";

export const getPaymentInfo = async (_req, res) => {
  try {
    const data = paymentService.getPaymentInfo();
    return sendSuccess(res, data, "Lấy thông tin thanh toán thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy thông tin thanh toán thất bại!");
  }
};
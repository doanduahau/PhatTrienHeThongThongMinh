import * as authService from "../services/auth.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import { validateInput } from "../validators/validate.js";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validators/auth.validator.js";

export const register = async (req, res) => {
  const validation = validateInput(registerSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await authService.register(validation.data);
    return sendSuccess(res, data, "Đăng ký tài khoản thành công!");
  } catch (error) {
    if (error?.code === "P2002") {
      const field = String(error.meta?.target || "").includes("email") ? "email" : "username";
      return sendError(res, field === "email" ? "Email đã được sử dụng!" : "Username đã tồn tại!", "400", {
        field,
      }, 400);
    }
    return sendAppError(res, error, "Đăng ký tài khoản thất bại!");
  }
};

export const login = async (req, res) => {
  const validation = validateInput(loginSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await authService.login(validation.data);
    return sendSuccess(res, data, "Đăng nhập thành công!");
  } catch (error) {
    return sendAppError(res, error, "Đăng nhập thất bại!");
  }
};

export const me = async (req, res) => {
  try {
    const user = await authService.getProfile(req.user.id);
    return sendSuccess(res, user, "Lấy thông tin cá nhân thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy thông tin cá nhân thất bại!");
  }
};

export const updateMe = async (req, res) => {
  const validation = validateInput(updateProfileSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await authService.updateProfile(req.user.id, validation.data);
    return sendSuccess(res, data, "Cập nhật hồ sơ thành công!");
  } catch (error) {
    return sendAppError(res, error, "Cập nhật hồ sơ thất bại!");
  }
};

export const changePassword = async (req, res) => {
  const validation = validateInput(changePasswordSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await authService.changePassword(
      req.user.id,
      validation.data.currentPassword,
      validation.data.newPassword,
    );
    return sendSuccess(res, data, "Đổi mật khẩu thành công!");
  } catch (error) {
    return sendAppError(res, error, "Đổi mật khẩu thất bại!");
  }
};

export const forgotPassword = async (req, res) => {
  const validation = validateInput(forgotPasswordSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await authService.forgotPassword(validation.data.email);
    return sendSuccess(res, data, "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi!");
  } catch (error) {
    return sendAppError(res, error, "Yêu cầu đặt lại mật khẩu thất bại!");
  }
};

export const resetPassword = async (req, res) => {
  const validation = validateInput(resetPasswordSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await authService.resetPassword(validation.data.token, validation.data.newPassword);
    return sendSuccess(res, data, "Đặt lại mật khẩu thành công!");
  } catch (error) {
    return sendAppError(res, error, "Đặt lại mật khẩu thất bại!");
  }
};

export const verifyEmail = async (req, res) => {
  const validation = validateInput(verifyEmailSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await authService.verifyEmail(validation.data.token);
    return sendSuccess(res, data, "Xác thực email thành công!");
  } catch (error) {
    return sendAppError(res, error, "Xác thực email thất bại!");
  }
};

export const resendVerification = async (req, res) => {
  try {
    const data = await authService.resendVerification(req.user.id);
    return sendSuccess(res, data, "Đã gửi lại email xác thực!");
  } catch (error) {
    return sendAppError(res, error, "Gửi lại email xác thực thất bại!");
  }
};

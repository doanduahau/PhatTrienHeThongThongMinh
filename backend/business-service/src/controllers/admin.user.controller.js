import * as adminUserService from "../services/admin.user.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import { validateInput } from "../validators/validate.js";
import {
  adminUsersQuerySchema,
  userIdParamSchema,
  setUserLockSchema,
  setUserRoleSchema,
} from "../validators/admin.user.validator.js";

export const getUsers = async (req, res) => {
  const validation = validateInput(adminUsersQuerySchema, req.query);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await adminUserService.getUsers(validation.data);
    return sendSuccess(res, data, "Lấy danh sách người dùng thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy danh sách người dùng thất bại!");
  }
};

export const setLock = async (req, res) => {
  const params = validateInput(userIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  const validation = validateInput(setUserLockSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await adminUserService.setLock(params.data.id, validation.data.isLocked, req.user.id);
    return sendSuccess(res, data, validation.data.isLocked ? "Khoá tài khoản thành công!" : "Mở khoá tài khoản thành công!");
  } catch (error) {
    return sendAppError(res, error, "Cập nhật khoá tài khoản thất bại!");
  }
};

export const setRole = async (req, res) => {
  const params = validateInput(userIdParamSchema, req.params);
  if (!params.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", params.errors, 400);
  }

  const validation = validateInput(setUserRoleSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await adminUserService.setRole(params.data.id, validation.data.role, req.user.id);
    return sendSuccess(res, data, "Đổi role thành công!");
  } catch (error) {
    return sendAppError(res, error, "Đổi role thất bại!");
  }
};
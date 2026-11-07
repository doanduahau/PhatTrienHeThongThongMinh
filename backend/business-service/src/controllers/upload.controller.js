import * as uploadService from "../services/upload.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";

export const upload = async (req, res) => {
  if (!req.file) {
    return sendError(res, "Thiếu file ảnh! Gửi multipart/form-data với field 'file'.", "400", null, 400);
  }

  try {
    const data = await uploadService.uploadImage(req.file);
    return sendSuccess(res, data, "Upload ảnh thành công!");
  } catch (error) {
    return sendAppError(res, error, "Upload ảnh thất bại!");
  }
};
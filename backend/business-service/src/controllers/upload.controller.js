import * as uploadService from "../services/upload.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import { imageLinkSchema } from "../validators/image.validator.js";
import { validateInput } from "../validators/validate.js";

export const upload = async (req, res) => {
  if (req.file && req.body?.imageUrl !== undefined) {
    return sendError(res, "Chỉ chọn một cách: gửi link imageUrl hoặc upload file image!", "400", null, 400);
  }
  if (!req.file && req.is("application/json")) {
    const validation = validateInput(imageLinkSchema, req.body);
    if (!validation.success) {
      return sendError(res, "Link ảnh không hợp lệ!", "400", validation.errors, 400);
    }
    return sendSuccess(res, { url: validation.data.imageUrl, source: "url" }, "Link ảnh hợp lệ!");
  }
  if (!req.file) {
    return sendError(res, "Gửi JSON { imageUrl } hoặc multipart/form-data với file 'image'.", "400", null, 400);
  }

  try {
    const data = await uploadService.uploadImage(req.file);
    return sendSuccess(res, data, "Upload ảnh thành công!");
  } catch (error) {
    return sendAppError(res, error, "Upload ảnh thất bại!");
  }
};

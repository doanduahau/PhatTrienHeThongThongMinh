import multer from "multer";
import { UPLOAD_MAX_BYTES } from "../utils/constants.js";
import { sendError } from "../utils/response.js";

const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) return cb(null, true);
    return cb(new Error("Chỉ chấp nhận file ảnh JPEG, PNG, WebP hoặc GIF!"));
  },
}).single("file");

/** Bọc multer để trả lỗi rõ ràng thay vì thông báo 4xx chung của global handler. */
export const handleImageUpload = (req, res, next) => {
  imageUpload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return sendError(res, `File quá lớn! Tối đa ${UPLOAD_MAX_BYTES / (1024 * 1024)}MB.`, "400", null, 400);
    }
    return sendError(res, err.message || "Upload không hợp lệ!", "400", null, 400);
  });
};
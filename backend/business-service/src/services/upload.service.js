import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

let client = null;

const getClient = () => {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    throw new AppError("Chưa cấu hình Supabase Storage (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)!", {
      status: "503",
      httpStatus: 503,
    });
  }
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
};

export const uploadImage = async (file) => {
  const storage = getClient().storage.from(env.supabaseBucket);
  const path = `products/${crypto.randomUUID()}.${EXT_BY_MIME[file.mimetype]}`;

  const { error } = await storage.upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) {
    console.error("[UPLOAD] Supabase Storage lỗi:", error.message);
    throw new AppError("Upload ảnh lên storage thất bại!", { status: "502", httpStatus: 502 });
  }

  const { data } = storage.getPublicUrl(path);
  return { url: data.publicUrl, path, size: file.size, contentType: file.mimetype };
};
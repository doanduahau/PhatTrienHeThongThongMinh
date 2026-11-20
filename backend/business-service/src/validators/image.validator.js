import { z } from "zod";

export const imageUrlSchema = z.string({ required_error: "Link ảnh là bắt buộc!" })
  .trim()
  .url("Link ảnh phải là URL hợp lệ!")
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Link ảnh phải bắt đầu bằng http:// hoặc https://!");

export const imageLinkSchema = z.object({ imageUrl: imageUrlSchema }).strict();

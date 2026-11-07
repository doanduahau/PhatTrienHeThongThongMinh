import { z } from "zod";

const username = z
  .string({ required_error: "Username là bắt buộc!" })
  .trim()
  .min(3, "Username phải có ít nhất 3 ký tự!")
  .max(50, "Username tối đa 50 ký tự!")
  .regex(/^[a-zA-Z0-9_]+$/, "Username chỉ gồm chữ, số và dấu gạch dưới!");

const email = z
  .string({ required_error: "Email là bắt buộc!" })
  .trim()
  .email("Email không hợp lệ!")
  .max(100, "Email tối đa 100 ký tự!");

const password = z
  .string({ required_error: "Mật khẩu là bắt buộc!" })
  .min(6, "Mật khẩu phải có ít nhất 6 ký tự!")
  .max(72, "Mật khẩu tối đa 72 ký tự!");

export const registerSchema = z.object({
  username,
  email,
  password,
  address: z.string().trim().max(255, "Địa chỉ tối đa 255 ký tự!").optional(),
});

export const loginSchema = z.object({
  account: z
    .string({ required_error: "Tài khoản là bắt buộc!" })
    .trim()
    .min(1, "Tài khoản không được để trống!"),
  password: z.string({ required_error: "Mật khẩu là bắt buộc!" }).min(1, "Mật khẩu không được để trống!"),
});

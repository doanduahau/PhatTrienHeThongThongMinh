import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { prisma } from "../clients/prisma.client.js";
import { env } from "../config/env.js";
import { ROLES, RESET_TOKEN_TTL_MINUTES, VERIFY_TOKEN_TTL_HOURS } from "../utils/constants.js";
import { AppError, badRequest, forbidden } from "../utils/AppError.js";
import { sendMail } from "../utils/mailer.js";

const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  address: true,
  role: true,
  emailVerified: true,
  createdAt: true,
};

const INVALID_CREDENTIALS = "Tài khoản hoặc mật khẩu không đúng!";

export const hashPassword = (plainPassword) => bcrypt.hash(plainPassword, env.bcryptSaltRounds);

export const verifyPassword = (plainPassword, hashedPassword) => bcrypt.compare(plainPassword, hashedPassword);

export const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const generateToken = () => crypto.randomBytes(32).toString("hex");
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const sendMailSafe = async (mail) => {
  try {
    await sendMail(mail);
  } catch (error) {
    console.error("[MAIL] Gửi mail thất bại:", error.message);
  }
};

const issueVerification = async (user) => {
  const token = generateToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verifyTokenHash: hashToken(token),
      verifyTokenExpires: new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 3600 * 1000),
    },
  });
  await sendMailSafe({
    to: user.email,
    subject: "Xác thực email - Gear Shop",
    text: `Xác thực email của bạn bằng mã: ${token}\nHoặc mở link: ${env.appUrl}/verify-email?token=${token}\nMã hết hạn sau ${VERIFY_TOKEN_TTL_HOURS} giờ.`,
  });
};

/**
 * Đăng ký: tạo user + giỏ hàng rỗng trong cùng 1 transaction.
 */
export const register = async ({ username, email, password, address }) => {
  const hashedPassword = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        address,
        role: ROLES.CUSTOMER,
      },
      select: publicUserSelect,
    });
    await tx.cart.create({ data: { userId: created.id } });
    return created;
  });

  await issueVerification(user);
  return { user, token: signToken(user) };
};

export const login = async ({ account, password }) => {
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: account }, { email: account }] },
  });

  if (!user) {
    throw new AppError(INVALID_CREDENTIALS, { status: "401", httpStatus: 401 });
  }

  const isMatch = await verifyPassword(password, user.password);
  if (!isMatch) {
    throw new AppError(INVALID_CREDENTIALS, { status: "401", httpStatus: 401 });
  }

  if (user.isLocked) {
    throw forbidden("Tài khoản đã bị khoá, vui lòng liên hệ quản trị viên!");
  }

  return { user: { ...user, password: undefined }, token: signToken(user) };
};

export const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) {
    throw new AppError("Không tồn tại người dùng!", { status: "404", httpStatus: 404 });
  }
  return user;
};

export const updateProfile = async (userId, { email, address }) => {
  const data = {};
  if (address !== undefined) data.address = address;

  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) throw new AppError("Không tồn tại người dùng!", { status: "404", httpStatus: 404 });

  let changedEmail = false;
  if (email !== undefined && email !== current.email) {
    const taken = await prisma.user.findFirst({ where: { email, id: { not: userId } } });
    if (taken) throw badRequest("Email đã được sử dụng!");
    data.email = email;
    data.emailVerified = false;
    changedEmail = true;
  }

  const updated = await prisma.user.update({ where: { id: userId }, data, select: publicUserSelect });
  if (changedEmail) await issueVerification(updated);
  return updated;
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("Không tồn tại người dùng!", { status: "404", httpStatus: 404 });

  const isMatch = await verifyPassword(currentPassword, user.password);
  if (!isMatch) throw badRequest("Mật khẩu hiện tại không đúng!");

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: await hashPassword(newPassword),
      resetTokenHash: null,
      resetTokenExpires: null,
    },
  });
  return { changed: true };
};

/** Luôn trả thành công dù email có tồn tại hay không (không lộ thông tin tài khoản). */
export const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { sent: true };

  const token = generateToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetTokenHash: hashToken(token),
      resetTokenExpires: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });
  await sendMailSafe({
    to: user.email,
    subject: "Đặt lại mật khẩu - Gear Shop",
    text: `Mã đặt lại mật khẩu: ${token}\nHoặc mở link: ${env.appUrl}/reset-password?token=${token}\nMã hết hạn sau ${RESET_TOKEN_TTL_MINUTES} phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
  });
  return { sent: true };
};

export const resetPassword = async (token, newPassword) => {
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: hashToken(token), resetTokenExpires: { gt: new Date() } },
  });
  if (!user) throw badRequest("Token không hợp lệ hoặc đã hết hạn!");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await hashPassword(newPassword),
      resetTokenHash: null,
      resetTokenExpires: null,
    },
  });
  return { reset: true };
};

export const verifyEmail = async (token) => {
  const user = await prisma.user.findFirst({
    where: { verifyTokenHash: hashToken(token), verifyTokenExpires: { gt: new Date() } },
  });
  if (!user) throw badRequest("Token không hợp lệ hoặc đã hết hạn!");

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyTokenHash: null, verifyTokenExpires: null },
  });
  return { verified: true };
};

export const resendVerification = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("Không tồn tại người dùng!", { status: "404", httpStatus: 404 });
  if (user.emailVerified) throw badRequest("Email đã được xác thực!");

  await issueVerification(user);
  return { sent: true };
};
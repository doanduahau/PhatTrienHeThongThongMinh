import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../clients/prisma.client.js";
import { env } from "../config/env.js";
import { ROLES } from "../utils/constants.js";
import { AppError } from "../utils/AppError.js";

const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  address: true,
  role: true,
  createdAt: true,
};

const INVALID_CREDENTIALS = "Tài khoản hoặc mật khẩu không đúng!";

export const hashPassword = (plainPassword) => bcrypt.hash(plainPassword, env.bcryptSaltRounds);

export const verifyPassword = (plainPassword, hashedPassword) => bcrypt.compare(plainPassword, hashedPassword);

export const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

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

  const { password: _hashed, ...safeUser } = user;
  return { user: safeUser, token: signToken(user) };
};

export const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) {
    throw new AppError("Không tồn tại người dùng!", { status: "404", httpStatus: 404 });
  }
  return user;
};

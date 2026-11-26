import { prisma } from "../clients/prisma.client.js";
import { badRequest, notFound } from "../utils/AppError.js";
import { hashPassword } from "./auth.service.js";

const safeUserSelect = {
  id: true,
  username: true,
  email: true,
  address: true,
  role: true,
  emailVerified: true,
  isLocked: true,
  createdAt: true,
  _count: { select: { orders: true } },
};

export const getUsers = async ({ page, limit, search, role, isLocked }) => {
  const where = {};
  if (role) where.role = role;
  if (isLocked !== undefined) where.isLocked = isLocked;
  if (search) {
    where.OR = [
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: safeUserSelect,
      orderBy: { id: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

export const setLock = async (targetId, isLocked, actorId) => {
  if (targetId === actorId) throw badRequest("Không thể tự khoá/mở khoá tài khoản của chính mình!");
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) throw notFound("Không tồn tại người dùng!");

  return prisma.user.update({ where: { id: targetId }, data: { isLocked }, select: safeUserSelect });
};

export const setRole = async (targetId, role, actorId) => {
  if (targetId === actorId) throw badRequest("Không thể tự đổi role của chính mình!");
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) throw notFound("Không tồn tại người dùng!");

  return prisma.user.update({ where: { id: targetId }, data: { role }, select: safeUserSelect });
};

/**
 * Tạo tài khoản từ trang quản trị: giống register (kèm giỏ trống) nhưng KHÔNG gửi mail
 * xác thực — admin tự đặt mật khẩu và tự đánh dấu emailVerified.
 * Trùng username/email rơi vào P2002, sendAppError đã dịch sẵn.
 */
export const createUser = async ({ username, email, password, address, role, emailVerified }) => {
  const hashedPassword = await hashPassword(password);

  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { username, email, password: hashedPassword, address, role, emailVerified },
      select: safeUserSelect,
    });
    await tx.cart.create({ data: { userId: created.id } });
    return created;
  });
};

/**
 * Xoá cứng tài khoản. Order.user là onDelete: Cascade nên xoá user có đơn sẽ xoá luôn
 * lịch sử mua hàng -> chặn, gợi ý khoá tài khoản thay thế.
 */
export const removeUser = async (targetId, actorId) => {
  if (targetId === actorId) throw badRequest("Không thể xoá tài khoản của chính mình!");

  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, _count: { select: { orders: true } } },
  });
  if (!user) throw notFound("Không tồn tại người dùng!");

  const orderCount = user._count.orders;
  if (orderCount > 0) {
    throw badRequest(
      `Tài khoản còn ${orderCount} đơn hàng nên không thể xoá. Hãy khoá tài khoản thay thế!`,
      { orderCount },
    );
  }

  await prisma.user.delete({ where: { id: targetId } });
  return { removed: true };
};

/** Admin đặt lại mật khẩu; token forgot/reset cũ bị thu hồi vì không còn nghĩa. */
export const resetPassword = async (targetId, password) => {
  const user = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!user) throw notFound("Không tồn tại người dùng!");

  return prisma.user.update({
    where: { id: targetId },
    data: {
      password: await hashPassword(password),
      resetTokenHash: null,
      resetTokenExpires: null,
    },
    select: safeUserSelect,
  });
};
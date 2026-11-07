import { prisma } from "../clients/prisma.client.js";
import { badRequest, notFound } from "../utils/AppError.js";

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
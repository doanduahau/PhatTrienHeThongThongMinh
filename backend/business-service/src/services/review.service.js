import { prisma } from "../clients/prisma.client.js";
import { badRequest, notFound } from "../utils/AppError.js";
import { ORDER_STATUS } from "../utils/constants.js";
import { endOfDayInAppTz, startOfDayInAppTz } from "../utils/date.js";
import { lockProduct, applyVoteInTx } from "./rating.service.js";

export const createOrUpdate = async (userId, productId, { score, content }) => {
  return prisma.$transaction(async (tx) => {
    await lockProduct(tx, productId);

    const purchased = await tx.orderItem.findFirst({
      where: { productId, order: { userId, status: { not: ORDER_STATUS.CANCELLED } } },
      select: { id: true },
    });
    if (!purchased) {
      throw badRequest("Bạn cần mua sản phẩm này trước khi viết nhận xét!");
    }

    const review = await tx.review.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, content },
      update: { content },
    });

    const summary = await applyVoteInTx(tx, userId, productId, score);
    return {
      review: { id: review.id, content: review.content, createdAt: review.createdAt },
      ...summary,
      myScore: score,
    };
  });
};

export const getReviews = async (productId, { page, limit }) => {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw notFound("Không tồn tại sản phẩm!");

  const where = { productId };
  const [rows, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  const votes = await prisma.rating.findMany({
    where: { productId, userId: { in: rows.map((row) => row.userId) } },
    select: { userId: true, score: true },
  });
  const scoreByUser = new Map(votes.map((vote) => [vote.userId, vote.score]));

  return {
    items: rows.map((row) => ({
      id: row.id,
      username: row.user.username,
      content: row.content,
      score: scoreByUser.get(row.userId) ?? null,
      createdAt: row.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

/**
 * Nhận xét toàn cục cho trang quản trị (moderation). Điểm sao của từng nhận xét lấy từ
 * bảng ratings theo đúng cặp (userId, productId) — cùng cách ghép với getReviews.
 */
export const getAllReviews = async ({ page, limit, search, productId, userId, from, to }) => {
  const where = {};
  if (productId) where.productId = productId;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = startOfDayInAppTz(from);
    if (to) where.createdAt.lte = endOfDayInAppTz(to);
  }
  if (search) {
    const contains = { contains: search, mode: "insensitive" };
    where.OR = [
      { content: contains },
      { user: { username: contains } },
      { product: { name: contains } },
    ];
  }

  const [rows, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, username: true } },
        product: { select: { id: true, name: true, imageUrl: true, isActive: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  const votes = rows.length
    ? await prisma.rating.findMany({
        where: { OR: rows.map((row) => ({ userId: row.userId, productId: row.productId })) },
        select: { userId: true, productId: true, score: true },
      })
    : [];
  const scoreByKey = new Map(votes.map((vote) => [`${vote.userId}:${vote.productId}`, vote.score]));

  return {
    items: rows.map((row) => ({
      id: row.id,
      content: row.content,
      createdAt: row.createdAt,
      score: scoreByKey.get(`${row.userId}:${row.productId}`) ?? null,
      user: row.user,
      product: row.product,
    })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

/** Xoá nhận xét chữ; lượt chấm sao đi kèm vẫn giữ (khách xoá riêng qua DELETE /rating). */
export const removeReview = async (userId, productId) => {
  const review = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!review) throw notFound("Bạn chưa nhận xét sản phẩm này!");

  await prisma.review.delete({ where: { id: review.id } });
  return { removed: true };
};

/** Xoá nhận xét theo admin (qua productId + reviewId); giữ nguyên phiếu sao (ratings). */
export const removeReviewByAdmin = async ({ productId, reviewId }) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw notFound("Không tìm thấy nhận xét này!");
  if (review.productId !== productId) throw badRequest("Nhận xét này không thuộc sản phẩm đã chọn!");

  await prisma.review.delete({ where: { id: review.id } });
  return { removed: true };
};
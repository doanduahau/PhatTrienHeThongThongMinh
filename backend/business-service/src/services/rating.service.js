import { prisma } from "../clients/prisma.client.js";
import { notFound } from "../utils/AppError.js";
import { roundMoney } from "../utils/money.js";

// Khóa dòng product để hai lượt vote đồng thời không ghi đè trung bình cũ (READ COMMITTED).
export const lockProduct = async (tx, productId) => {
  const rows = await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;
  if (rows.length === 0) throw notFound("Không tồn tại sản phẩm!");
};

const recalc = async (tx, productId) => {
  const agg = await tx.rating.aggregate({
    where: { productId },
    _avg: { score: true },
    _count: true,
  });
  const ratingCount = agg._count;
  const rating = ratingCount === 0 ? 0 : roundMoney(agg._avg.score);
  await tx.product.update({ where: { id: productId }, data: { rating, ratingCount } });
  return { rating, ratingCount };
};

/** Dùng chung cho chấm sao trực tiếp và review của người mua (đã ở trong transaction). */
export const applyVoteInTx = async (tx, userId, productId, score) => {
  await lockProduct(tx, productId);
  await tx.rating.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId, score },
    update: { score },
  });
  return recalc(tx, productId);
};

export const rateProduct = async (userId, productId, score) => {
  return prisma.$transaction(async (tx) => {
    const summary = await applyVoteInTx(tx, userId, productId, score);
    return { ...summary, myScore: score };
  });
};

export const getSummary = async (productId) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw notFound("Không tồn tại sản phẩm!");
  return { rating: product.rating, ratingCount: product.ratingCount };
};

export const removeRating = async (userId, productId) => {
  return prisma.$transaction(async (tx) => {
    await lockProduct(tx, productId);
    const vote = await tx.rating.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!vote) throw notFound("Bạn chưa đánh giá sản phẩm này!");
    await tx.rating.delete({ where: { id: vote.id } });
    const summary = await recalc(tx, productId);
    return { ...summary, myScore: null };
  });
};
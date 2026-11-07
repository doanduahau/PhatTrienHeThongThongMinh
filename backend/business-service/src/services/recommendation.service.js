import { prisma } from "../clients/prisma.client.js";
import { mlClient } from "../clients/ml.client.js";
import { notFound } from "../utils/AppError.js";

/**
 * Tầng nghiệp vụ gợi ý:
 * - ML chỉ trả product_id + score.
 * - Backend hydrate giá/tồn kho/ảnh từ DB để dữ liệu luôn mới.
 * - Nếu ML lỗi/timeout, luôn có fallback bằng Prisma; không làm sập API.
 */

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true } },
};

const ML_META_KEYS = ["score", "rank", "confidence", "lift", "support"];

const toMeta = (item) => {
  const meta = {};
  for (const key of ML_META_KEYS) {
    if (item[key] !== undefined && item[key] !== null) {
      meta[key] = Number(item[key]);
    }
  }
  return meta;
};

const decorate = (product, meta = {}) => ({
  ...product,
  isInStock: product.stockQuantity > 0,
  ...meta,
});

/** Gắn dữ liệu sản phẩm thật vào danh sách product_id ML trả về, giữ nguyên thứ tự. */
const hydrateScoredItems = async (items = []) => {
  const ids = [
    ...new Set(
      items
        .map((item) => Number(item.product_id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  if (ids.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: productInclude,
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  return items.flatMap((item) => {
    const product = byId.get(Number(item.product_id));
    return product ? [decorate(product, toMeta(item))] : [];
  });
};

const fallbackFeatured = async (categoryId, limit) => {
  const products = await prisma.product.findMany({
    where: categoryId ? { categoryId } : {},
    orderBy: [{ rating: "desc" }, { id: "asc" }],
    take: limit,
    include: productInclude,
  });
  return products.map((product, index) => decorate(product, { rank: index + 1, score: 0 }));
};

/** Sản phẩm tương tự (Cosine). Fallback: cùng danh mục hoặc cùng hãng, rating cao. */
export const getSimilarProducts = async (productId, limit = 8) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: productInclude,
  });
  if (!product) throw notFound("Không tồn tại sản phẩm!");

  const response = await mlClient.similarProducts(productId, limit);
  let items = response?.items?.length ? await hydrateScoredItems(response.items) : [];

  if (items.length === 0) {
    const fallbackRows = await prisma.product.findMany({
      where: {
        id: { not: productId },
        OR: [{ categoryId: product.categoryId }, { brandId: product.brandId }],
      },
      orderBy: [{ rating: "desc" }, { id: "asc" }],
      take: limit,
      include: productInclude,
    });
    items = fallbackRows.map((row, index) => decorate(row, { rank: index + 1, score: 0 }));
    return { source: "fallback", model: null, items };
  }

  return { source: "ml", model: response.model ?? null, items };
};

/** Gợi ý mua kèm theo giỏ hàng (FP-Growth). */
export const getCartSuggestions = async (userId, limit = 6) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });
  const cartProductIds = cart?.items.map((item) => item.productId) ?? [];

  if (cartProductIds.length === 0) {
    return { source: "fallback", reason: "empty_cart", model: null, items: await fallbackFeatured(undefined, limit) };
  }

  const response = await mlClient.bundles(cartProductIds, limit);
  let items = response?.items?.length ? await hydrateScoredItems(response.items) : [];

  if (items.length === 0) {
    const cartProducts = await prisma.product.findMany({
      where: { id: { in: cartProductIds } },
      select: { categoryId: true },
    });
    const categoryIds = [...new Set(cartProducts.map((row) => row.categoryId))];

    const fallbackRows = await prisma.product.findMany({
      where: {
        id: { notIn: cartProductIds },
        ...(categoryIds.length ? { categoryId: { in: categoryIds } } : {}),
      },
      orderBy: [{ rating: "desc" }, { id: "asc" }],
      take: limit,
      include: productInclude,
    });
    items = fallbackRows.map((row, index) => decorate(row, { rank: index + 1, score: 0 }));
    return { source: "fallback", reason: "no_rules", model: null, items };
  }

  return { source: "ml", model: response.model ?? null, items };
};

/** Gợi ý cá nhân hóa (Cosine + K-Means). Cold-start -> featured. */
export const getForYou = async (userId, limit = 8) => {
  const response = await mlClient.personalized(userId, limit);

  if (response && !response.cold_start && response.items?.length) {
    return { source: "ml", model: response.model ?? null, items: await hydrateScoredItems(response.items) };
  }

  return {
    source: "fallback",
    reason: response?.cold_start ? "cold_start" : "ml_unavailable",
    model: null,
    items: await fallbackFeatured(undefined, limit),
  };
};

/** Sản phẩm nổi bật. ML xếp hạng trước, lỗi thì backend tự xếp theo rating. */
export const getFeaturedProducts = async (categoryId, limit = 10) => {
  const response = await mlClient.featured(categoryId, limit);
  if (response?.items?.length) {
    const items = await hydrateScoredItems(response.items);
    if (items.length > 0) {
      return { source: "ml", model: response.model ?? null, items };
    }
  }

  return { source: "fallback", model: null, items: await fallbackFeatured(categoryId, limit) };
};

/** Trạng thái ML service cho admin/debug. */
export const getMlStatus = async () => {
  const health = await mlClient.health();
  return {
    online: Boolean(health),
    serviceUrl: mlClient.serviceUrl,
    detail: health,
  };
};

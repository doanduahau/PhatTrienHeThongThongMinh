import { prisma } from "../clients/prisma.client.js";
import { badRequest, notFound } from "../utils/AppError.js";
import { roundMoney, toNumber } from "../utils/money.js";
import { MAX_CART_QUANTITY } from "../utils/constants.js";

const productInclude = {
  product: {
    include: {
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true } },
    },
  },
};

export const getOrCreateCart = (userId) =>
  prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

export const getCart = async (userId) => {
  const cart = await getOrCreateCart(userId);

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: productInclude,
    orderBy: { createdAt: "asc" },
  });

  const mapped = items.map((item) => ({
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    price: toNumber(item.product.price),
    lineTotal: roundMoney(toNumber(item.product.price) * item.quantity),
    product: {
      id: item.product.id,
      name: item.product.name,
      imageUrl: item.product.imageUrl,
      color: item.product.color,
      rating: toNumber(item.product.rating),
      stockQuantity: item.product.stockQuantity,
      category: item.product.category,
      brand: item.product.brand,
    },
  }));

  return {
    id: cart.id,
    items: mapped,
    totalItems: mapped.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: roundMoney(mapped.reduce((sum, item) => sum + item.lineTotal, 0)),
  };
};

export const addItem = async (userId, { productId, quantity }) => {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw notFound("Không tồn tại sản phẩm!");

    const cart = await tx.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    // Cộng dồn nguyên tử ở tầng DB để không mất cập nhật khi thêm đồng thời.
    // Nếu vượt giới hạn, throw để transaction rollback lại phép cộng.
    const item = await tx.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity: { increment: quantity } },
    });

    if (item.quantity > MAX_CART_QUANTITY) {
      throw badRequest(`Mỗi sản phẩm chỉ được thêm tối đa ${MAX_CART_QUANTITY} cái!`, {
        maxQuantity: MAX_CART_QUANTITY,
      });
    }

    if (item.quantity > product.stockQuantity) {
      throw badRequest(`Sản phẩm "${product.name}" chỉ còn ${product.stockQuantity} trong kho!`, {
        productId,
        available: product.stockQuantity,
      });
    }

    return item;
  });
};

export const updateItem = async (userId, productId, quantity) => {
  const cart = await getOrCreateCart(userId);

  if (quantity === 0) {
    const result = await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    if (result.count === 0) throw notFound("Sản phẩm không có trong giỏ hàng!");
    return { removed: true };
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw notFound("Không tồn tại sản phẩm!");

    if (quantity > product.stockQuantity) {
      throw badRequest(`Sản phẩm "${product.name}" chỉ còn ${product.stockQuantity} trong kho!`, {
        productId,
        available: product.stockQuantity,
      });
    }

    const existing = await tx.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    if (!existing) throw notFound("Sản phẩm không có trong giỏ hàng!");

    return tx.cartItem.update({ where: { id: existing.id }, data: { quantity } });
  });
};

export const removeItem = async (userId, productId) => {
  const cart = await getOrCreateCart(userId);
  const result = await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  if (result.count === 0) throw notFound("Sản phẩm không có trong giỏ hàng!");
  return { removed: true };
};

export const clearCart = async (userId) => {
  const cart = await getOrCreateCart(userId);
  const result = await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return { removedItems: result.count };
};

import { prisma } from "../clients/prisma.client.js";
import { badRequest, notFound } from "../utils/AppError.js";
import { roundMoney, toNumber } from "../utils/money.js";
import { MAX_CART_QUANTITY } from "../utils/constants.js";

const productInclude = {
  product: { include: { category: { select: { id: true, name: true, slug: true } } } },
};

export const getOrCreateCart = async (userId) => {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { userId } });
};

const withCartContext = (tx, userId) =>
  tx.cart.findUnique({ where: { userId } }).then((cart) => cart ?? tx.cart.create({ data: { userId } }));

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
    const cart = await withCartContext(tx, userId);
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw notFound("Không tồn tại sản phẩm!");

    const existing = await tx.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    const nextQuantity = (existing?.quantity ?? 0) + quantity;

    if (nextQuantity > MAX_CART_QUANTITY) {
      throw badRequest(`Mỗi sản phẩm chỉ được thêm tối đa ${MAX_CART_QUANTITY} cái!`, {
        maxQuantity: MAX_CART_QUANTITY,
      });
    }

    if (nextQuantity > product.stockQuantity) {
      throw badRequest(`Sản phẩm "${product.name}" chỉ còn ${product.stockQuantity} trong kho!`, {
        productId,
        available: product.stockQuantity,
      });
    }

    if (existing) {
      return tx.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQuantity } });
    }

    return tx.cartItem.create({ data: { cartId: cart.id, productId, quantity: nextQuantity } });
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

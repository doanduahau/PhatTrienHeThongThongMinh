import { prisma } from "../clients/prisma.client.js";
import { AppError, badRequest, forbidden, notFound } from "../utils/AppError.js";
import { roundMoney, toNumber } from "../utils/money.js";
import { ALLOWED_TRANSITIONS, ORDER_STATUS, ROLES } from "../utils/constants.js";

const orderInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true, imageUrl: true, color: true } },
    },
  },
  shippingMethod: true,
};

/**
 * Checkout: kiểm tra giỏ + tồn kho + phí ship, tạo đơn và trừ kho
 * trong MỘT transaction. Mọi lỗi đều rollback toàn bộ.
 */
export const checkout = async (userId, { shippingMethodId, shippingAddress, shippingPhone }) => {
  const order = await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      throw badRequest("Giỏ hàng đang trống, không thể đặt hàng!");
    }

    const shippingMethod = await tx.shippingMethod.findUnique({ where: { id: shippingMethodId } });
    if (!shippingMethod) throw notFound("Phương thức vận chuyển không tồn tại!");
    if (!shippingMethod.isActive) {
      throw badRequest("Phương thức vận chuyển đã ngừng hoạt động!");
    }

    let subtotal = 0;

    for (const item of cart.items) {
      // Cập nhật có điều kiện: chống bán âm kho khi 2 người đặt cùng lúc
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stockQuantity: { gte: item.quantity } },
        data: { stockQuantity: { decrement: item.quantity } },
      });

      if (updated.count === 0) {
        const current = await tx.product.findUnique({ where: { id: item.productId } });
        throw new AppError(`Sản phẩm "${item.product.name}" không đủ hàng!`, {
          data: {
            productId: item.productId,
            requested: item.quantity,
            available: current?.stockQuantity ?? 0,
          },
        });
      }

      subtotal += toNumber(item.product.price) * item.quantity;
    }

    const totalAmount = roundMoney(subtotal + toNumber(shippingMethod.fee));

    const created = await tx.order.create({
      data: {
        userId,
        shippingMethodId,
        totalAmount,
        status: ORDER_STATUS.PENDING,
        shippingAddress,
        shippingPhone,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price, // snapshot giá tại thời điểm đặt
          })),
        },
      },
      include: orderInclude,
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return created;
  });

  console.log(`[ORDER] tạo đơn #${order.id} cho user #${userId}, tổng ${order.totalAmount}`);
  return order;
};

export const getMyOrders = async (userId, { page, limit, status }) => {
  const where = { userId, ...(status ? { status } : {}) };

  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: orderInclude,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
  };
};

export const getMyOrderById = async (userId, orderId) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: orderInclude,
  });
  if (!order) throw notFound("Không tồn tại đơn hàng!");
  return order;
};

const changeStatus = async ({ order, nextStatus, actor }) => {
  const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];

  if (actor.role !== ROLES.ADMIN && order.status !== ORDER_STATUS.PENDING) {
    throw forbidden("Bạn chỉ có thể huỷ đơn hàng đang chờ xác nhận!");
  }

  if (!allowed.includes(nextStatus)) {
    throw badRequest(`Không thể chuyển đơn từ "${order.status}" sang "${nextStatus}"!`, {
      currentStatus: order.status,
      allowedStatuses: allowed,
    });
  }

  return prisma.$transaction(async (tx) => {
    if (nextStatus === ORDER_STATUS.CANCELLED) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data: { status: nextStatus },
      include: orderInclude,
    });

    console.log(
      `[ORDER] #${order.id}: ${order.status} -> ${nextStatus} bởi ${actor.role} #${actor.id}`,
    );

    return updated;
  });
};

/** Khách tự huỷ đơn của mình (chỉ khi pending) */
export const cancelMyOrder = async (userId, orderId) => {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.userId !== userId) throw notFound("Không tồn tại đơn hàng!");

  return changeStatus({
    order,
    nextStatus: ORDER_STATUS.CANCELLED,
    actor: { id: userId, role: ROLES.CUSTOMER },
  });
};

export const getAllOrders = async ({ page, limit, status, userId, from, to }) => {
  const where = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: orderInclude,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
  };
};

export const updateStatusByAdmin = async (orderId, nextStatus, actor) => {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw notFound("Không tồn tại đơn hàng!");
  return changeStatus({ order, nextStatus, actor });
};

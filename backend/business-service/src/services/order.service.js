import { prisma } from "../clients/prisma.client.js";
import { AppError, badRequest, forbidden, notFound } from "../utils/AppError.js";
import { roundMoney, toNumber } from "../utils/money.js";
import { ALLOWED_TRANSITIONS, ORDER_STATUS, ROLES } from "../utils/constants.js";

const orderInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          color: true,
          brand: { select: { id: true, name: true } },
        },
      },
    },
  },
  shippingMethod: true,
};

/**
 * Checkout: kiểm tra giỏ + tồn kho + phí ship, tạo đơn và trừ kho
 * trong MỘT transaction. Mọi lỗi đều rollback toàn bộ.
 */
export const checkout = async (userId, { shippingMethodId, shippingAddress, shippingPhone, paymentMethod }) => {
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
        paymentMethod,
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
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
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

const changeStatus = async ({ orderId, nextStatus, actor, ownerId = null }) => {
  return prisma.$transaction(async (tx) => {
    // Đọc đơn bên trong transaction để mọi kiểm tra và ghi trạng thái dùng cùng một snapshot.
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });

    if (!order || (ownerId !== null && order.userId !== ownerId)) {
      throw notFound("Không tồn tại đơn hàng!");
    }

    if (actor.role !== ROLES.ADMIN && order.status !== ORDER_STATUS.PENDING) {
      throw forbidden("Bạn chỉ có thể huỷ đơn hàng đang chờ xác nhận!");
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw badRequest(`Không thể chuyển đơn từ "${order.status}" sang "${nextStatus}"!`, {
        currentStatus: order.status,
        allowedStatuses: allowed,
      });
    }

    // Chỉ một request được "giành" quyền đổi trạng thái. Request thua sẽ thấy count = 0
    // sau khi PostgreSQL khoá dòng, nhờ đó không hoàn kho hai lần.
    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: nextStatus },
    });

    if (claimed.count === 0) {
      throw badRequest("Đơn hàng vừa được thay đổi bởi thao tác khác, vui lòng tải lại!", {
        orderId: order.id,
        currentStatus: order.status,
      });
    }

    if (nextStatus === ORDER_STATUS.CANCELLED) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }

    const updated = await tx.order.findUnique({ where: { id: order.id }, include: orderInclude });

    console.log(
      `[ORDER] #${order.id}: ${order.status} -> ${nextStatus} bởi ${actor.role} #${actor.id}`,
    );

    return updated;
  });
};

/** Khách tự huỷ đơn của mình (chỉ khi pending) */
export const cancelMyOrder = async (userId, orderId) => {
  return changeStatus({
    orderId,
    nextStatus: ORDER_STATUS.CANCELLED,
    actor: { id: userId, role: ROLES.CUSTOMER },
    ownerId: userId,
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
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

export const updateStatusByAdmin = async (orderId, nextStatus, actor) => {
  return changeStatus({ orderId, nextStatus, actor });
};

export const updatePaymentStatusByAdmin = async (orderId, paymentStatus) => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw notFound("Không tồn tại đơn hàng!");
    if (order.status === ORDER_STATUS.CANCELLED) {
      throw badRequest("Không thể cập nhật thanh toán cho đơn đã huỷ!");
    }

    const claimed = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: order.paymentStatus },
      data: { paymentStatus },
    });
    if (claimed.count === 0) {
      throw badRequest("Thanh toán vừa được cập nhật bởi thao tác khác, vui lòng tải lại!", {
        orderId,
      });
    }

    console.log(`[PAYMENT] #${orderId}: ${order.paymentStatus} -> ${paymentStatus}`);
    return tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
  });
};

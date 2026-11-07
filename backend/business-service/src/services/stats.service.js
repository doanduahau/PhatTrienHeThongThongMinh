import { Prisma } from "@prisma/client";
import { prisma } from "../clients/prisma.client.js";
import { ORDER_STATUS, PAYMENT_STATUS } from "../utils/constants.js";
import { toNumber } from "../utils/money.js";

export const getOverview = async () => {
  const [totalUsers, totalProducts, byStatus, delivered, awaitingPayment] = await prisma.$transaction([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.order.aggregate({
      where: { status: ORDER_STATUS.DELIVERED },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.order.count({
      where: { paymentStatus: PAYMENT_STATUS.UNPAID, status: { not: ORDER_STATUS.CANCELLED } },
    }),
  ]);

  const ordersByStatus = Object.fromEntries(byStatus.map((row) => [row.status, row._count]));

  return {
    totalUsers,
    totalProducts,
    ordersByStatus,
    deliveredOrders: delivered._count,
    revenue: toNumber(delivered._sum.totalAmount),
    awaitingPayment,
  };
};

/** Doanh thu tính trên đơn đã giao (delivered). */
export const getRevenue = async ({ groupBy, from, to }) => {
  const conditions = [Prisma.sql`status = ${ORDER_STATUS.DELIVERED}`];
  if (from) conditions.push(Prisma.sql`created_at >= ${new Date(from)}`);
  if (to) conditions.push(Prisma.sql`created_at <= ${new Date(to)}`);

  const rows = await prisma.$queryRaw`
    SELECT date_trunc(${groupBy}, created_at) AS period,
           COUNT(*)::int AS "orderCount",
           COALESCE(SUM(total_amount), 0)::float8 AS revenue
    FROM orders
    WHERE ${Prisma.join(conditions, " AND ")}
    GROUP BY period
    ORDER BY period
  `;

  return {
    groupBy,
    items: rows.map((row) => ({
      period: row.period.toISOString().slice(0, groupBy === "month" ? 7 : 10),
      orderCount: row.orderCount,
      revenue: row.revenue,
    })),
  };
};

export const getTopProducts = async (limit) => {
  const rows = await prisma.$queryRaw`
    SELECT p.id, p.name, p.image_url AS "imageUrl",
           SUM(oi.quantity)::int AS "soldQuantity",
           COALESCE(SUM(oi.price * oi.quantity), 0)::float8 AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status <> ${ORDER_STATUS.CANCELLED}
    GROUP BY p.id, p.name, p.image_url
    ORDER BY "soldQuantity" DESC, revenue DESC
    LIMIT ${limit}
  `;
  return { items: rows };
};

export const getLowStock = async ({ threshold, limit }) => {
  const where = { stockQuantity: { lte: threshold } };
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        price: true,
        brand: { select: { id: true, name: true } },
      },
      orderBy: [{ stockQuantity: "asc" }, { id: "asc" }],
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);
  return { threshold, total, items };
};
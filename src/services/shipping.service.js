import { prisma } from "../clients/prisma.client.js";

export const getAll = ({ onlyActive = false } = {}) =>
  prisma.shippingMethod.findMany({
    where: onlyActive ? { isActive: true } : undefined,
    orderBy: { fee: "asc" },
  });

export const getById = (id) => prisma.shippingMethod.findUnique({ where: { id } });

export const create = (payload) => prisma.shippingMethod.create({ data: payload });

export const update = (id, payload) => prisma.shippingMethod.update({ where: { id }, data: payload });

export const remove = (id) => prisma.shippingMethod.delete({ where: { id } });

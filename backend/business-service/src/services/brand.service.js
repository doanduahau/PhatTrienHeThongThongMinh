import { prisma } from "../clients/prisma.client.js";

export const getAll = () =>
  prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

export const getById = (id) => prisma.brand.findUnique({ where: { id } });

export const create = (payload) => prisma.brand.create({ data: payload });

export const update = (id, payload) => prisma.brand.update({ where: { id }, data: payload });

export const remove = (id) => prisma.brand.delete({ where: { id } });

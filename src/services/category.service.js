import { prisma } from "../clients/prisma.client.js";

export const getAll = () =>
  prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

export const getById = (id) => prisma.category.findUnique({ where: { id } });

export const getBySlug = (slug) => prisma.category.findUnique({ where: { slug } });

export const create = (payload) => prisma.category.create({ data: payload });

export const update = (id, payload) => prisma.category.update({ where: { id }, data: payload });

export const remove = (id) => prisma.category.delete({ where: { id } });

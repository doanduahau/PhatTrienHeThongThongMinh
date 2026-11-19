import { prisma } from "../clients/prisma.client.js";

export const getAll = ({ slug, categoryId } = {}) => {
  const where = {};
  // `slug` nhận một slug hoặc danh sách slug phân tách bởi dấu phẩy (trang nhóm).
  if (slug) {
    const slugs = String(slug).split(",").map((value) => value.trim()).filter(Boolean);
    if (slugs.length) where.products = { some: { category: { slug: { in: slugs } } } };
  }
  if (categoryId) where.products = { some: { categoryId: Number(categoryId) } };
  return prisma.brand.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
};

export const getById = (id) => prisma.brand.findUnique({ where: { id } });

export const create = (payload) => prisma.brand.create({ data: payload });

export const update = (id, payload) => prisma.brand.update({ where: { id }, data: payload });

export const remove = (id) => prisma.brand.delete({ where: { id } });

import { prisma } from "../clients/prisma.client.js";
import { badRequest, notFound } from "../utils/AppError.js";

export const getAll = () =>
  prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

export const getById = (id) => prisma.category.findUnique({ where: { id } });

export const create = (payload) => prisma.category.create({ data: payload });

export const update = async (id, payload) => {
  const category = await getById(id);
  if (!category) throw notFound("Danh mục không tồn tại!");
  // Slug là khóa ánh xạ bảng thông số và đường dẫn catalog, không phải nhãn hiển thị.
  if (payload.slug !== undefined && payload.slug !== category.slug) {
    throw badRequest("Không thể đổi slug danh mục. Bạn có thể đổi tên hiển thị.", { slug: category.slug });
  }
  return prisma.category.update({ where: { id }, data: payload });
};

export const remove = (id) => prisma.category.delete({ where: { id } });

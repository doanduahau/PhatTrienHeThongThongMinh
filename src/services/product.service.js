import { prisma } from "../clients/prisma.client.js";
import { removeUndefined } from "../utils/response.js";
import { AppError, notFound, badRequest } from "../utils/AppError.js";
import { getDetailModel, parseDetail } from "../utils/productDetail.js";

const categorySelect = { id: true, name: true, slug: true };

const sortMap = {
  newest: { createdAt: "desc" },
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
  name_asc: { name: "asc" },
};

const buildWhere = ({ categoryId, slug, search }) => {
  const where = {};
  if (categoryId) where.categoryId = categoryId;
  if (slug) where.category = { slug };
  if (search) where.name = { contains: search, mode: "insensitive" };
  return where;
};

export const getAll = async ({ page, limit, sort, ...filters }) => {
  const where = buildWhere(filters);
  const orderBy = sortMap[sort] ?? sortMap.newest;

  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { category: { select: categorySelect } },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: items.map(({ stockQuantity, ...item }) => ({
      ...item,
      isInStock: stockQuantity > 0,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const findDetailRow = async (slug, productId) => {
  const model = getDetailModel(slug);
  if (!model) return null;
  return prisma[model].findUnique({ where: { productId } });
};

export const getById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: { select: categorySelect } },
  });

  if (!product) throw notFound("Không tồn tại sản phẩm!");

  const detail = await findDetailRow(product.category.slug, product.id);
  return { ...product, detail, isInStock: product.stockQuantity > 0 };
};

/**
 * Tạo sản phẩm + dòng thông số chi tiết trong cùng 1 transaction.
 * Thiếu thông số -> không có bản ghi nào được tạo.
 */
export const create = async (payload) => {
  const { detail, ...productData } = payload;

  const category = await prisma.category.findUnique({ where: { id: productData.categoryId } });
  if (!category) throw notFound("Danh mục không tồn tại!");

  const parsed = parseDetail(category.slug, detail);

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data: removeUndefined(productData) });

    let detailRow = null;
    if (parsed) {
      detailRow = await tx[parsed.model].create({
        data: { ...parsed.data, productId: product.id },
      });
    }

    return { ...product, detail: detailRow };
  });
};

export const update = async (id, payload) => {
  const { detail, ...productData } = payload;

  const existing = await prisma.product.findUnique({
    where: { id },
    include: { category: { select: categorySelect } },
  });
  if (!existing) throw notFound("Không tồn tại sản phẩm!");

  const changingCategory =
    Boolean(productData.categoryId) && productData.categoryId !== existing.categoryId;

  let targetSlug = existing.category.slug;
  let parsed = null;

  if (changingCategory) {
    const currentDetail = await findDetailRow(existing.category.slug, id);
    if (currentDetail) {
      throw badRequest(
        "Không thể đổi danh mục của sản phẩm đã có thông số chi tiết. Hãy tạo sản phẩm mới.",
        { currentCategoryId: existing.categoryId, requestedCategoryId: productData.categoryId },
      );
    }

    const targetCategory = await prisma.category.findUnique({
      where: { id: productData.categoryId },
    });
    if (!targetCategory) throw notFound("Danh mục không tồn tại!");
    targetSlug = targetCategory.slug;

    // Danh mục mới có bảng chi tiết thì bắt buộc phải kèm thông số hợp lệ.
    if (getDetailModel(targetSlug)) {
      parsed = parseDetail(targetSlug, detail);
    }
  } else if (detail !== undefined) {
    parsed = parseDetail(existing.category.slug, detail);
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id },
      data: removeUndefined(productData),
    });

    let detailRow = null;
    if (parsed) {
      detailRow = await tx[parsed.model].upsert({
        where: { productId: id },
        create: { ...parsed.data, productId: id },
        update: parsed.data,
      });
    } else {
      detailRow = await findDetailRow(targetSlug, id);
    }

    return { ...product, detail: detailRow };
  });
};

export const remove = async (id) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw notFound("Không tồn tại sản phẩm!");
  return prisma.product.delete({ where: { id } });
};

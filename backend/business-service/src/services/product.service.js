import { prisma } from "../clients/prisma.client.js";
import { removeUndefined } from "../utils/response.js";
import { notFound, badRequest } from "../utils/AppError.js";
import { getDetailModel, parseDetail } from "../utils/productDetail.js";

const categorySelect = { id: true, name: true, slug: true };
const brandSelect = { id: true, name: true };

const productRelationsInclude = {
  category: { select: categorySelect },
  brand: { select: brandSelect },
  mouse: true,
  keyboard: true,
  headphone: true,
  setup: true,
  mousepad: true,
};

const sortMap = {
  newest: { createdAt: "desc" },
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
  name_asc: { name: "asc" },
  rating_desc: { rating: "desc" },
};

const DETAIL_TABLE_BY_SLUG = {
  chuot: "mouse",
  "ban-phim": "keyboard",
  "tai-nghe": "headphone",
  soundcard: "headphone",
  "lot-chuot": "mousepad",
  ghe: "setup",
  ban: "setup",
  "arm-man-hinh": "setup",
  "phu-kien-cong-thai-hoc": "setup",
};

// Bảng mice/keyboards dùng bộ giá trị riêng, bảng headphones dùng bộ khác.
const CONNECTIVITY_BY_TABLE = {
  mouse: ["wired", "wireless", "tri_mode"],
  keyboard: ["wired", "wireless", "tri_mode"],
  headphone: ["wired_3.5mm", "wireless_2.4g", "bluetooth"],
};

const POLLING_TABLES = ["mouse", "keyboard"];

const slugList = (slug) =>
  String(slug ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

/**
 * Cột chia sẻ giữa nhiều bảng chi tiết (connectivity, polling_rate_hz) phải được áp vào
 * đúng bảng của danh mục đang xem. Trước đây hàm luôn gán vào bảng mouse trước rồi mới
 * tới keyboard/headphone có điều kiện "!where.mouse", nên trang Bàn phím và Tai nghe lọc
 * ra 0 kết quả: sản phẩm của chúng không có dòng ở bảng mice.
 */
const buildWhere = ({
  categoryId,
  brandId,
  brand,
  slug,
  search,
  inStock,
  minPrice,
  maxPrice,
  connectivity,
  handOrientation,
  minWeight,
  maxWeight,
  pollingRate,
  switchType,
  layout,
  hasRapidTrigger,
  hasHotswap,
  supportMacos,
  headphoneType,
  hasMic,
  hasAnc,
  padType,
  mouseControl,
  base,
  size,
  surface,
  speed,
  setupCategory,
  maxLoadKg,
}) => {
  const where = {};
  if (categoryId) where.categoryId = categoryId;
  if (brandId) where.brandId = brandId;
  if (brand) where.brand = { name: { contains: brand, mode: "insensitive" } };
  // `slug` nhận một slug hoặc danh sách slug phân tách bởi dấu phẩy (trang nhóm).
  const slugs = slugList(slug);
  if (slugs.length) where.category = { slug: { in: slugs } };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { brand: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (inStock === "1" || inStock === "true" || inStock === true) {
    where.stockQuantity = { gt: 0 };
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined && minPrice !== "") where.price.gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== "") where.price.lte = Number(maxPrice);
  }

  // Các bảng chi tiết mà tập slug đang xem dùng; rỗng = trang toàn catalog (mở cho mọi bảng).
  const tables = slugs.map((value) => DETAIL_TABLE_BY_SLUG[value]).filter(Boolean);
  const isOpenTo = (table) => tables.length === 0 || tables.includes(table);

  /**
   * Điều kiện khớp bất kỳ bảng chi tiết nào thuộc danh mục đang xem.
   * Không bảng nào mang thuộc tính này thì không sản phẩm nào khớp được.
   */
  const matchAnyDetail = (conditionByTable) => {
    const or = Object.entries(conditionByTable)
      .filter(([table]) => isOpenTo(table))
      .map(([table, condition]) => ({ [table]: condition }));
    if (or.length === 0) {
      where.id = { in: [] };
      return;
    }
    where.AND = [...(where.AND ?? []), { OR: or }];
  };

  if (connectivity) {
    matchAnyDetail(
      Object.fromEntries(
        Object.entries(CONNECTIVITY_BY_TABLE)
          .filter(([, values]) => values.includes(connectivity))
          .map(([table]) => [table, { connectivity }]),
      ),
    );
  }

  if (pollingRate) {
    matchAnyDetail(
      Object.fromEntries(
        POLLING_TABLES.map((table) => [table, { pollingRateHz: Number(pollingRate) }]),
      ),
    );
  }

  // Mouse filters
  const mouseWhere = {};
  if (handOrientation) mouseWhere.handOrientation = handOrientation;
  if (minWeight !== undefined || maxWeight !== undefined) {
    mouseWhere.weightG = {};
    if (minWeight !== undefined && minWeight !== "") mouseWhere.weightG.gte = Number(minWeight);
    if (maxWeight !== undefined && maxWeight !== "") mouseWhere.weightG.lte = Number(maxWeight);
  }
  if (switchType) mouseWhere.switchType = { contains: switchType, mode: "insensitive" };
  if (Object.keys(mouseWhere).length > 0) where.mouse = mouseWhere;

  // Keyboard filters
  const keyboardWhere = {};
  if (layout) keyboardWhere.layout = layout;
  if (hasRapidTrigger !== undefined && hasRapidTrigger !== "") {
    keyboardWhere.hasRapidTrigger = hasRapidTrigger === true || hasRapidTrigger === "true" || hasRapidTrigger === "1";
  }
  if (hasHotswap !== undefined && hasHotswap !== "") {
    keyboardWhere.hasHotswap = hasHotswap === true || hasHotswap === "true" || hasHotswap === "1";
  }
  if (supportMacos !== undefined && supportMacos !== "") {
    keyboardWhere.supportMacos = supportMacos === true || supportMacos === "true" || supportMacos === "1";
  }
  if (Object.keys(keyboardWhere).length > 0) where.keyboard = keyboardWhere;

  // Headphone filters
  const headphoneWhere = {};
  if (headphoneType) headphoneWhere.headphoneType = headphoneType;
  if (hasMic !== undefined && hasMic !== "") {
    headphoneWhere.hasMic = hasMic === true || hasMic === "true" || hasMic === "1";
  }
  if (hasAnc !== undefined && hasAnc !== "") {
    headphoneWhere.hasAnc = hasAnc === true || hasAnc === "true" || hasAnc === "1";
  }
  if (Object.keys(headphoneWhere).length > 0) where.headphone = headphoneWhere;

  // Mousepad filters
  const padWhere = {};
  if (padType) padWhere.padType = padType;
  if (mouseControl) padWhere.mouseControl = mouseControl;
  if (base) padWhere.base = base;
  if (size) padWhere.size = size;
  if (surface) padWhere.surface = surface;
  if (speed) padWhere.speed = speed;
  if (Object.keys(padWhere).length > 0) where.mousepad = padWhere;

  // Setup filters
  const setupWhere = {};
  if (setupCategory) setupWhere.setupCategory = setupCategory;
  if (maxLoadKg !== undefined && maxLoadKg !== "") setupWhere.maxLoadKg = { gte: Number(maxLoadKg) };
  if (Object.keys(setupWhere).length > 0) where.setup = setupWhere;

  return where;
};

/** Kiểm tra brandId có tồn tại trong bảng brands hay không */
const assertBrandExists = async (brandId) => {
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) throw notFound("Thương hiệu không tồn tại!");
  return brand;
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
      include: productRelationsInclude,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: items.map(({ stockQuantity, mouse, keyboard, headphone, setup, mousepad, ...item }) => ({
      ...item,
      isInStock: stockQuantity > 0,
      detail: mouse || keyboard || headphone || setup || mousepad || null,
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
    include: productRelationsInclude,
  });

  if (!product) throw notFound("Không tồn tại sản phẩm!");

  const detailRow = await findDetailRow(product.category.slug, product.id);
  return { ...product, detail: detailRow, isInStock: product.stockQuantity > 0 };
};

/**
 * Tạo sản phẩm + dòng thông số chi tiết trong cùng 1 transaction.
 * Thiếu thông số -> không có bản ghi nào được tạo.
 */
export const create = async (payload) => {
  const { detail, ...productData } = payload;

  const category = await prisma.category.findUnique({ where: { id: productData.categoryId } });
  if (!category) throw notFound("Danh mục không tồn tại!");
  await assertBrandExists(productData.brandId);

  const parsed = parseDetail(category.slug, detail);

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: removeUndefined(productData),
      include: productRelationsInclude,
    });

    let detailRow = null;
    if (parsed) {
      detailRow = await tx[parsed.model].create({
        data: { ...parsed.data, productId: product.id },
      });
    }

    return {
      ...product,
      detail: detailRow,
    };
  });
};

export const update = async (id, payload) => {
  const { detail, ...productData } = payload;

  const existing = await prisma.product.findUnique({
    where: { id },
    include: productRelationsInclude,
  });
  if (!existing) throw notFound("Không tồn tại sản phẩm!");

  if (productData.brandId !== undefined) {
    await assertBrandExists(productData.brandId);
  }

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
      include: productRelationsInclude,
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

    return {
      ...product,
      detail: detailRow,
    };
  });
};

export const remove = async (id) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw notFound("Không tồn tại sản phẩm!");
  return prisma.product.delete({ where: { id } });
};

import { prisma } from "../clients/prisma.client.js";
import { mlClient } from "../clients/ml.client.js";

/**
 * Tìm kiếm thông minh: ML (SVM + Regex) chỉ phân tích câu truy vấn,
 * backend tự dựng filter Prisma. Nhờ vậy schema CSDL chỉ tồn tại ở backend.
 */

const CATEGORY_SLUG_MAP = {
  chuot: "chuot",
  mouse: "chuot",
  tai_nghe: "tai-nghe",
  headphone: "tai-nghe",
  soundcard: "soundcard",
  ban_phim: "ban-phim",
  keyboard: "ban-phim",
  ghe: "ghe",
  chair: "ghe",
  ban: "ban",
  desk: "ban",
  arm: "arm-man-hinh",
  phu_kien: "phu-kien-cong-thai-hoc",
  lot_chuot: "lot-chuot",
  mousepad: "lot-chuot",
};

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true } },
};

const containsInsensitive = (value) => ({ contains: value, mode: "insensitive" });

const isMouse = (filter) => ({ mouse: { is: filter } });
const isKeyboard = (filter) => ({ keyboard: { is: filter } });
const isHeadphone = (filter) => ({ headphone: { is: filter } });

const buildConnectivityFilters = (values = []) => {
  const filters = [];
  const wantsWireless = values.includes("wireless") || values.includes("multi");

  if (wantsWireless) {
    filters.push(
      isMouse({ connectivity: { in: ["wireless", "tri_mode"] } }),
      isKeyboard({ connectivity: { in: ["wireless", "tri_mode"] } }),
      isHeadphone({ connectivity: { in: ["wireless_2.4g", "bluetooth"] } }),
    );
  }

  if (values.includes("wired")) {
    filters.push(
      isMouse({ connectivity: "wired" }),
      isKeyboard({ connectivity: "wired" }),
      isHeadphone({ connectivity: "wired_3.5mm" }),
    );
  }

  if (values.includes("bluetooth")) {
    filters.push(
      isHeadphone({ connectivity: "bluetooth" }),
      isMouse({ connectivity: "tri_mode" }),
      isKeyboard({ connectivity: "tri_mode" }),
    );
  }

  return filters;
};

const switchFilter = (keywords) => ({
  OR: keywords.map((keyword) => isKeyboard({ switch: containsInsensitive(keyword) })),
});

/** Map soft tag -> filter Prisma. Tag không có cột tương ứng sẽ bị bỏ qua. */
const SOFT_TAG_FILTERS = {
  cong_thai_hoc: isMouse({ handOrientation: "ergonomic" }),
  doi_xung: isMouse({ handOrientation: "symmetrical" }),
  sieu_nhe_under_60g: isMouse({ weightG: { lt: 60 } }),
  rapid_trigger: isKeyboard({ hasRapidTrigger: true }),
  hot_swap: isKeyboard({ hasHotswap: true }),
  layout_mac_chuan: isKeyboard({ supportMacos: true }),
  switch_linear: switchFilter(["Red", "Linear", "Yellow", "Silver", "Magnetic"]),
  switch_tactile: switchFilter(["Brown", "Tactile", "Banana", "Purple"]),
  switch_clicky: switchFilter(["Blue", "Clicky", "Green"]),
  layout_compact: isKeyboard({ layout: { in: ["60%", "65%", "75%", "TKL"] } }),
  fullsize_nhap_lieu_excel: isKeyboard({ layout: "Fullsize" }),
  iem: isHeadphone({ headphoneType: "in_ear" }),
  tai_nghe_on_ear_nhe: isHeadphone({ headphoneType: "on_ear" }),
  cach_am_tot: isHeadphone({ hasAnc: true }),
  mic_loc_on_dam_thoai_hop: isHeadphone({ hasMic: true }),
  tri_mode: {
    OR: [
      isMouse({ connectivity: "tri_mode" }),
      isKeyboard({ connectivity: "tri_mode" }),
    ],
  },
  polling_rate_cao: {
    OR: [
      isMouse({ pollingRateHz: { gte: 4000 } }),
      isKeyboard({ pollingRateHz: { gte: 4000 } }),
    ],
  },
};

/**
 * Chuyển kết quả parse của ML thành `where` của Prisma.
 */
export const buildSmartSearchWhere = (hardConstraints = {}, softTags = [], rawQuery = "") => {
  const clauses = [];

  const categorySlugs = [
    ...new Set(
      (hardConstraints.categories ?? [])
        .map((key) => CATEGORY_SLUG_MAP[key])
        .filter(Boolean),
    ),
  ];
  if (categorySlugs.length > 0) {
    clauses.push({ category: { slug: { in: categorySlugs } } });
  }

  const brandConditions = [];
  for (const brand of hardConstraints.brands ?? []) {
    brandConditions.push({ brand: { name: containsInsensitive(brand) } });
    brandConditions.push({ name: containsInsensitive(brand) });
  }
  if (brandConditions.length > 0) {
    clauses.push({ OR: brandConditions });
  }

  if (hardConstraints.keyword) {
    clauses.push({ name: containsInsensitive(hardConstraints.keyword) });
  }

  const price = {};
  if (hardConstraints.min_price) price.gte = hardConstraints.min_price;
  if (hardConstraints.max_price) price.lte = hardConstraints.max_price;
  if (Object.keys(price).length > 0) {
    clauses.push({ price });
  }

  const connectivityFilters = buildConnectivityFilters(hardConstraints.connectivity ?? []);
  if (connectivityFilters.length > 0) {
    clauses.push({ OR: connectivityFilters });
  }

  if (hardConstraints.max_weight_g) {
    clauses.push(isMouse({ weightG: { lte: hardConstraints.max_weight_g } }));
  }
  if (hardConstraints.min_weight_g) {
    clauses.push(isMouse({ weightG: { gte: hardConstraints.min_weight_g } }));
  }

  if (hardConstraints.polling_rate_hz) {
    clauses.push({
      OR: [
        isMouse({ pollingRateHz: { gte: hardConstraints.polling_rate_hz } }),
        isKeyboard({ pollingRateHz: { gte: hardConstraints.polling_rate_hz } }),
      ],
    });
  }

  if (hardConstraints.hotswap) clauses.push(isKeyboard({ hasHotswap: true }));
  if (hardConstraints.mac_support) clauses.push(isKeyboard({ supportMacos: true }));
  if (hardConstraints.has_mic) clauses.push(isHeadphone({ hasMic: true }));
  if (hardConstraints.noise_cancelling) clauses.push(isHeadphone({ hasAnc: true }));

  for (const tag of softTags) {
    const filter = SOFT_TAG_FILTERS[tag];
    if (filter) clauses.push(filter);
  }

  // Không bóc tách được gì -> tìm tự do theo tên/hãng, tránh trả toàn bộ sản phẩm.
  if (clauses.length === 0) {
    const trimmed = rawQuery.trim();
    if (trimmed) {
      clauses.push({
        OR: [
          { name: containsInsensitive(trimmed) },
          { brand: { name: containsInsensitive(trimmed) } },
        ],
      });
    } else {
      return { id: -1 };
    }
  }

  return clauses.length === 1 ? clauses[0] : { AND: clauses };
};

const normalizeAnalysis = (parsed) => ({
  intent: parsed.intent,
  confidence: parsed.confidence,
  isSearch: parsed.is_search,
  shouldQueryDb: parsed.should_query_db,
  hardConstraints: parsed.hard_constraints ?? {},
  softTags: parsed.soft_tags ?? [],
});

const emptyPage = (page, limit) => ({
  page,
  limit,
  total: 0,
  totalPages: 1,
});

export const smartSearch = async (query, { page = 1, limit = 20 } = {}) => {
  const parsed = await mlClient.parseSearch(query);
  const source = parsed ? "ml" : "fallback";

  const analysis = parsed
    ? normalizeAnalysis(parsed)
    : {
        intent: "tim_kiem_san_pham",
        confidence: 0,
        isSearch: true,
        shouldQueryDb: true,
        hardConstraints: {},
        softTags: [],
      };

  if (analysis.shouldQueryDb === false || analysis.isSearch === false) {
    return { query, source, analysis, items: [], pagination: emptyPage(page, limit) };
  }

  const where =
    source === "fallback"
      ? {
          OR: [
            { name: containsInsensitive(query) },
            { brand: { name: containsInsensitive(query) } },
          ],
        }
      : buildSmartSearchWhere(analysis.hardConstraints, analysis.softTags, query);

  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: [{ rating: "desc" }, { price: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: productInclude,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    query,
    source,
    analysis,
    items: items.map((product) => ({
      ...product,
      isInStock: product.stockQuantity > 0,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

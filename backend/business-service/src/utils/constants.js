export const ROLES = Object.freeze({
  CUSTOMER: "customer",
  ADMIN: "admin",
});

export const ORDER_STATUS = Object.freeze({
  PENDING: "pending",
  CONFIRMED: "confirmed",
  SHIPPING: "shipping",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
});

/**
 * Máy trạng thái đơn hàng: từ trạng thái hiện tại được phép chuyển sang đâu.
 * Bước 8 của PLAN.md.
 */
export const ALLOWED_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
});

/** Các trạng thái huỷ đơn cần hoàn tồn kho */
export const RESTOCK_ON_CANCEL = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED];

export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

export const PAYMENT_METHOD = Object.freeze({
  COD: "cod",
  BANK_TRANSFER: "bank_transfer",
});

export const PAYMENT_STATUS = Object.freeze({
  UNPAID: "unpaid",
  PAID: "paid",
});

export const REVIEW_CONTENT_MAX = 2000;
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const RESET_TOKEN_TTL_MINUTES = 15;
export const VERIFY_TOKEN_TTL_HOURS = 24;

export const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  // Giữ (page - 1) * MAX_LIMIT nằm trong giới hạn int4 của PostgreSQL
  MAX_PAGE: 21474836,
});

/** Danh mục có bảng chi tiết riêng (map slug -> model Prisma) */
export const PRODUCT_DETAIL_SLUGS = Object.freeze({
  MOUSE: "chuot",
  KEYBOARD: "ban-phim",
  HEADPHONE: "tai-nghe",
  SOUNDCARD: "soundcard",
  MOUSEPAD: "lot-chuot",
  SETUP: "setup",
  CHAIR: "ghe",
  DESK: "ban",
  ARM: "arm-man-hinh",
  ERGONOMIC_ACCESSORY: "phu-kien-cong-thai-hoc",
});

export const MAX_CART_QUANTITY = 99;

/** Giá trị lớn nhất của cột Int (int4) trong PostgreSQL/Prisma */
export const DB_ID_MAX = 2147483647;

/**
 * Prefix khoá chính dạng mã PREFIX-XXXX. Chỉ shipping_methods cần khai báo vì
 * id của nó được nhận từ client; ratings (DG) và reviews (NX) do CSDL sinh và
 * không bao giờ nhận từ input.
 */
export const ID_CODE_PREFIX = Object.freeze({
  SHIPPING_METHOD: "VC",
});

const TOKEN_KEY = "gear_token";
const USER_KEY = "gear_user";
const GUEST_CART_KEY = "gear_guest_cart";

export const auth = {
  token: () => localStorage.getItem(TOKEN_KEY),
  user: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  },
  isLoggedIn: () => Boolean(localStorage.getItem(TOKEN_KEY)),
  save: ({ user, token }) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

const readGuestCart = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeGuestCart = (items) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

/**
 * Giỏ của khách chưa đăng nhập: giữ ảnh chụp sản phẩm trong localStorage.
 * Khi đăng nhập, từng dòng được đẩy lên giỏ trên server.
 */
export const guestCart = {
  items: readGuestCart,
  count: () => readGuestCart().reduce((sum, item) => sum + item.quantity, 0),
  subtotal: () => readGuestCart().reduce((sum, item) => sum + item.price * item.quantity, 0),
  add: (product, quantity = 1) => {
    const items = readGuestCart();
    const existing = items.find((item) => item.productId === product.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        stockQuantity: product.stockQuantity ?? null,
        categorySlug: product.category?.slug ?? null,
        quantity,
      });
    }

    writeGuestCart(items);
  },
  setQuantity: (productId, quantity) => {
    const items = readGuestCart();
    const target = items.find((item) => item.productId === productId);
    if (!target) return;
    if (quantity <= 0) {
      writeGuestCart(items.filter((item) => item.productId !== productId));
      return;
    }
    target.quantity = quantity;
    writeGuestCart(items);
  },
  remove: (productId) => {
    writeGuestCart(readGuestCart().filter((item) => item.productId !== productId));
  },
  clear: () => writeGuestCart([]),
};

export const money = (value) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)}đ`;

export const dateTime = (value) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );

export const ORDER_STATUS_LABELS = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã huỷ",
};

export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );

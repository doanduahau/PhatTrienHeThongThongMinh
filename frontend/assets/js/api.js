// Địa chỉ business service. Đổi tại đây nếu backend chạy ở cổng khác.
export const API_BASE = "http://localhost:3000";

const TOKEN_KEY = "gear_token";

export class ApiError extends Error {
  constructor(message, httpStatus, data) {
    super(message);
    this.name = "ApiError";
    this.httpStatus = httpStatus;
    this.data = data;
  }
}

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
};

const request = async (path, { method = "GET", body } = {}) => {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Không kết nối được tới API. Kiểm tra business service đang chạy ở cổng 3000.",
      0,
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      payload.message || "Yêu cầu thất bại.",
      response.status,
      payload.data,
    );
  }

  return payload.data;
};

export const api = {
  health: () => request("/api/health"),

  categories: () => request("/api/categories"),
  brands: () => request("/api/brands"),
  products: (params) => request(`/api/products${buildQuery(params)}`),
  product: (id) => request(`/api/products/${id}`),
  smartSearch: (params) => request(`/api/products/search/smart${buildQuery(params)}`),
  similar: (id, limit = 4) => request(`/api/products/${id}/similar${buildQuery({ limit })}`),
  featured: (limit = 4) => request(`/api/recommendations/featured${buildQuery({ limit })}`),

  login: (account, password) =>
    request("/api/auth/login", { method: "POST", body: { account, password } }),
  register: (payload) => request("/api/auth/register", { method: "POST", body: payload }),
  me: () => request("/api/auth/me"),

  shippingMethods: () => request("/api/shipping-methods"),
  cart: () => request("/api/cart"),
  addToCart: (productId, quantity) =>
    request("/api/cart/items", { method: "POST", body: { productId, quantity } }),
  updateCartItem: (productId, quantity) =>
    request(`/api/cart/items/${productId}`, { method: "PUT", body: { quantity } }),
  removeCartItem: (productId) =>
    request(`/api/cart/items/${productId}`, { method: "DELETE" }),
  clearCart: () => request("/api/cart", { method: "DELETE" }),

  orders: (params) => request(`/api/orders${buildQuery(params)}`),
  order: (id) => request(`/api/orders/${id}`),
  checkout: (payload) => request("/api/orders", { method: "POST", body: payload }),
  cancelOrder: (id) => request(`/api/orders/${id}/cancel`, { method: "PATCH" }),
};

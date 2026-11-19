import type {
  Brand,
  Cart,
  Category,
  FeaturedList,
  Order,
  OrderList,
  Product,
  ProductList,
  Session,
  ShippingMethod,
  SmartSearchResult,
  User,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const TOKEN_KEY = "gear_token";

export class ApiError extends Error {
  httpStatus: number;
  data: unknown;
  constructor(message: string, httpStatus: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.httpStatus = httpStatus;
    this.data = data;
  }
}

export const tokenStore = {
  get: (): string | null =>
    typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

type QueryParams = Record<string, string | number | boolean | undefined>;

const buildQuery = (params: QueryParams = {}) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
};

async function request<T>(
  path: string,
  {
    method = "GET",
    body,
    revalidate,
  }: { method?: string; body?: unknown; revalidate?: number } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      ...(revalidate !== undefined ? { next: { revalidate } } : {}),
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
      (payload as { message?: string }).message || "Yêu cầu thất bại.",
      response.status,
      (payload as { data?: unknown }).data,
    );
  }
  return (payload as { data: T }).data;
}

/** API công khai — đọc phía server, cache ngắn theo Catalog. */
export const catalogApi = {
  categories: () =>
    request<Category[]>("/api/categories", { revalidate: 300 }),
  brands: () => request<Brand[]>("/api/brands", { revalidate: 300 }),
  products: (params: QueryParams) =>
    request<ProductList>(`/api/products${buildQuery(params)}`, {
      revalidate: 60,
    }),
  product: (id: number) =>
    request<Product>(`/api/products/${id}`, { revalidate: 60 }),
  featured: (limit = 8) =>
    request<FeaturedList>(
      `/api/recommendations/featured${buildQuery({ limit })}`,
      { revalidate: 60 },
    ),
  similar: (id: number, limit = 4) =>
    request<{ items: Product[] }>(
      `/api/products/${id}/similar${buildQuery({ limit })}`,
      { revalidate: 60 },
    ),
  smartSearch: (params: QueryParams) =>
    request<SmartSearchResult>(
      `/api/products/search/smart${buildQuery(params)}`,
    ),
};

/** API phía client — cần token, không cache. */
export const api = {
  smartSearch: catalogApi.smartSearch,
  login: (account: string, password: string) =>
    request<Session>("/api/auth/login", {
      method: "POST",
      body: { account, password },
    }),
  register: (payload: {
    username: string;
    email: string;
    password: string;
    address?: string;
  }) => request<Session>("/api/auth/register", { method: "POST", body: payload }),
  me: () => request<User>("/api/auth/me"),

  shippingMethods: () => request<ShippingMethod[]>("/api/shipping-methods"),
  cart: () => request<Cart>("/api/cart"),
  addToCart: (productId: number, quantity: number) =>
    request<Cart>("/api/cart/items", {
      method: "POST",
      body: { productId, quantity },
    }),
  updateCartItem: (productId: number, quantity: number) =>
    request<Cart>(`/api/cart/items/${productId}`, {
      method: "PUT",
      body: { quantity },
    }),
  removeCartItem: (productId: number) =>
    request<Cart>(`/api/cart/items/${productId}`, { method: "DELETE" }),

  orders: (params: QueryParams = {}) =>
    request<OrderList>(`/api/orders${buildQuery(params)}`),
  order: (id: number) => request<Order>(`/api/orders/${id}`),
  checkout: (payload: {
    shippingMethodId: string;
    shippingAddress: string;
    shippingPhone: string;
  }) => request<Order>("/api/orders", { method: "POST", body: payload }),
  cancelOrder: (id: number) =>
    request<Order>(`/api/orders/${id}/cancel`, { method: "PATCH" }),
};

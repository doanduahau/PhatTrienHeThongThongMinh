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
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

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

/** Gọi công khai thẳng business service (không cần đăng nhập). */
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
      "Không kết nối được tới API. Kiểm tra business service đang chạy.",
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

/** Gọi endpoint cần đăng nhập qua proxy same-origin — cookie httpOnly tự đính kèm. */
async function authRequest<T>(
  path: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/proxy/${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Không kết nối được máy chủ.", 0);
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

/** Gọi route auth same-origin (login/register/me/logout) — trả JSON thô của route. */
async function authFetch<T>(
  path: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Không kết nối được máy chủ.", 0);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      (payload as { message?: string }).message || "Yêu cầu thất bại.",
      response.status,
    );
  }
  return payload as T;
}

/** API công khai — đọc phía server, cache ngắn theo Catalog. */
export const catalogApi = {
  categories: () =>
    request<Category[]>("/api/categories", { revalidate: 300 }),
  brands: (params?: QueryParams) => request<Brand[]>(`/api/brands${buildQuery(params)}`, { revalidate: 300 }),
  products: (params: QueryParams) =>
    request<ProductList>(`/api/products${buildQuery(params)}`, {
      revalidate: 60,
    }),
  product: (id: number) =>
    request<Product>(`/api/products/${id}`, { revalidate: 60 }),
  featured: (limit = 8, categoryId?: number) =>
    request<FeaturedList>(
      `/api/recommendations/featured${buildQuery({ limit, categoryId })}`,
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

/** API phía client — đăng nhập qua cookie httpOnly, không cache. */
export const api = {
  smartSearch: catalogApi.smartSearch,
  /** Gợi ý cá nhân hoá — yêu cầu đăng nhập; lỗi 401/503 do caller tự fallback. */
  forYou: (limit = 8) =>
    authRequest<FeaturedList>(`recommendations/for-you${buildQuery({ limit })}`),
  login: (account: string, password: string) =>
    authFetch<Session>("/api/auth/login", {
      method: "POST",
      body: { account, password },
    }),
  register: (payload: {
    username: string;
    email: string;
    password: string;
    address?: string;
  }) =>
    authFetch<Session>("/api/auth/register", { method: "POST", body: payload }),
  me: () => authFetch<User>("/api/auth/me"),
  logout: () => authFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  shippingMethods: () => request<ShippingMethod[]>("/api/shipping-methods"),
  cart: () => authRequest<Cart>("cart"),
  addToCart: (productId: number, quantity: number) =>
    authRequest<Cart>("cart/items", {
      method: "POST",
      body: { productId, quantity },
    }),
  updateCartItem: (productId: number, quantity: number) =>
    authRequest<Cart>(`cart/items/${productId}`, {
      method: "PUT",
      body: { quantity },
    }),
  removeCartItem: (productId: number) =>
    authRequest<Cart>(`cart/items/${productId}`, { method: "DELETE" }),

  orders: (params: QueryParams = {}) =>
    authRequest<OrderList>(`orders${buildQuery(params)}`),
  order: (id: number) => authRequest<Order>(`orders/${id}`),
  checkout: (payload: {
    shippingMethodId: string;
    shippingAddress: string;
    shippingPhone: string;
  }) => authRequest<Order>("orders", { method: "POST", body: payload }),
  cancelOrder: (id: number) =>
    authRequest<Order>(`orders/${id}/cancel`, { method: "PATCH" }),
};

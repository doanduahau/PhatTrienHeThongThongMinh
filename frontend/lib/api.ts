import type {
  AdminCustomer,
  AdminCustomerList,
  AdminOrder,
  AdminOrderList,
  AdminReviewList,
  Brand,
  Cart,
  Category,
  FeaturedList,
  LowStockItem,
  MlDataset,
  MlModel,
  MlStatus,
  Order,
  OrderList,
  Product,
  ProductInput,
  ProductList,
  RevenuePoint,
  Session,
  ShippingMethod,
  SmartSearchResult,
  StatsOverview,
  TopProduct,
  User,
} from "./types";

// Cổng 5001 vì macOS chạy ControlCenter/AirPlay Receiver trên 5000; .env.example vẫn là 3000.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

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
  { method = "GET", body, file }: { method?: string; body?: unknown; file?: File } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/proxy/${path}`, {
      method,
      headers: { "Content-Type": file ? "application/octet-stream" : "application/json" },
      body: file ?? (body === undefined ? undefined : JSON.stringify(body)),
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

const mlDatasetPath = (scope: MlDataset["scope"], name: string) =>
  `admin/ml/datasets/${scope}/${encodeURIComponent(name)}`;

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
  updateProfile: (payload: { fullName?: string; email?: string; address?: string }) =>
    authRequest<User>("auth/me", { method: "PUT", body: payload }),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    authRequest<unknown>("auth/password", { method: "PUT", body: payload }),
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

  /**
   * Quản trị — mọi quyền thật đều do backend chặn (requireAdmin); UI chỉ hiển thị
   * cho token admin. Danh mục/thương hiệu/đơn hàng dùng PATCH/PUT theo validator backend.
   */
  admin: {
    orders: (params: QueryParams = {}) =>
      authRequest<AdminOrderList>(`admin/orders${buildQuery(params)}`),
    order: (id: number) => authRequest<AdminOrder>(`admin/orders/${id}`),
    setOrderStatus: (id: number, status: string) =>
      authRequest<AdminOrder>(`admin/orders/${id}/status`, {
        method: "PATCH",
        body: { status },
      }),
    setOrderPayment: (id: number, paymentStatus: string) =>
      authRequest<AdminOrder>(`admin/orders/${id}/payment`, {
        method: "PATCH",
        body: { paymentStatus },
      }),

    customers: (params: QueryParams = {}) =>
      authRequest<AdminCustomerList>(`admin/users${buildQuery(params)}`),
    createCustomer: (payload: {
      username: string;
      email: string;
      password: string;
      address?: string;
      role?: string;
    }) =>
      authRequest<AdminCustomer>("admin/users", {
        method: "POST",
        body: payload,
      }),
    setCustomerLock: (id: number, isLocked: boolean) =>
      authRequest<AdminCustomer>(`admin/users/${id}/lock`, {
        method: "PATCH",
        body: { isLocked },
      }),
    setCustomerRole: (id: number, role: string) =>
      authRequest<AdminCustomer>(`admin/users/${id}/role`, {
        method: "PATCH",
        body: { role },
      }),
    resetCustomerPassword: (id: number, password: string) =>
      authRequest<AdminCustomer>(`admin/users/${id}/reset-password`, {
        method: "POST",
        body: { password },
      }),
    deleteCustomer: (id: number) =>
      authRequest<AdminCustomer>(`admin/users/${id}`, { method: "DELETE" }),

    reviews: (params: QueryParams = {}) =>
      authRequest<AdminReviewList>(`admin/reviews${buildQuery(params)}`),
    deleteReview: (productId: number, reviewId: string) =>
      authRequest<unknown>(`products/${productId}/reviews/${reviewId}`, {
        method: "DELETE",
      }),

    products: (params: QueryParams = {}) =>
      authRequest<ProductList>(`products${buildQuery(params)}`),
    createProduct: (payload: ProductInput) =>
      authRequest<Product>("products", { method: "POST", body: payload }),
    updateProduct: (id: number, payload: ProductInput) =>
      authRequest<Product>(`products/${id}`, { method: "PUT", body: payload }),
    deleteProduct: (id: number) =>
      authRequest<unknown>(`products/${id}`, { method: "DELETE" }),

    categories: () => authRequest<Category[]>("categories"),
    createCategory: (payload: { name: string; slug: string }) =>
      authRequest<Category>("categories", { method: "POST", body: payload }),
    updateCategory: (id: number, payload: { name?: string; slug?: string }) =>
      authRequest<Category>(`categories/${id}`, { method: "PUT", body: payload }),
    deleteCategory: (id: number) =>
      authRequest<unknown>(`categories/${id}`, { method: "DELETE" }),

    brands: () => authRequest<Brand[]>("brands"),
    createBrand: (name: string) =>
      authRequest<Brand>("brands", { method: "POST", body: { name } }),
    updateBrand: (id: number, name: string) =>
      authRequest<Brand>(`brands/${id}`, { method: "PUT", body: { name } }),
    deleteBrand: (id: number) =>
      authRequest<unknown>(`brands/${id}`, { method: "DELETE" }),

    shipping: () => authRequest<ShippingMethod[]>("shipping-methods"),
    createShipping: (payload: {
      name: string;
      fee: number;
      estimatedDays?: string;
      isActive?: boolean;
    }) =>
      authRequest<ShippingMethod>("shipping-methods", {
        method: "POST",
        body: payload,
      }),
    updateShipping: (
      id: string,
      payload: {
        name?: string;
        fee?: number;
        estimatedDays?: string;
        isActive?: boolean;
      },
    ) =>
      authRequest<ShippingMethod>(`shipping-methods/${id}`, {
        method: "PUT",
        body: payload,
      }),
    deleteShipping: (id: string) =>
      authRequest<unknown>(`shipping-methods/${id}`, { method: "DELETE" }),

    stats: {
      overview: () => authRequest<StatsOverview>("admin/stats/overview"),
      revenue: (params: QueryParams = {}) =>
        authRequest<{ groupBy: string; items: RevenuePoint[] }>(
          `admin/stats/revenue${buildQuery(params)}`,
        ),
      topProducts: (limit = 5) =>
        authRequest<{ items: TopProduct[] }>(
          `admin/stats/top-products${buildQuery({ limit })}`,
        ),
      lowStock: (threshold = 5, limit = 8) =>
        authRequest<{ threshold: number; total: number; items: LowStockItem[] }>(
          `admin/stats/low-stock${buildQuery({ threshold, limit })}`,
        ),
    },

    mlStatus: () => authRequest<MlStatus>("recommendations/ml-status"),
    mlModels: () => authRequest<{ models: MlModel[] }>("admin/ml/models"),
    mlDatasets: () => authRequest<{ datasets: MlDataset[] }>("admin/ml/datasets"),
    mlDatasetUrl: ({ scope, name }: MlDataset) => `/api/proxy/${mlDatasetPath(scope, name)}`,
    uploadMlDataset: (file: File) =>
      authRequest<MlDataset>(mlDatasetPath("uploaded", file.name), { method: "PUT", file }),
    deleteMlDataset: (name: string) =>
      authRequest<{ name: string }>(mlDatasetPath("uploaded", name), { method: "DELETE" }),
    reloadMl: (key?: string) =>
      authRequest<{ reloaded: boolean; models: MlModel[] }>(`admin/ml/reload${buildQuery({ key })}`, {
        method: "POST",
      }),
  },
};

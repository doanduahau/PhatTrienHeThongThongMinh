// Kiểu dữ liệu trả về từ business service (:3000) — payload.data
export type Category = {
  id: number;
  name: string;
  slug: string;
  _count?: { products: number };
};

export type Brand = { id: number; name: string; slug?: string };

export type Product = {
  id: number;
  categoryId: number;
  brandId: number;
  name: string;
  color: string | null;
  stockQuantity: number;
  imageUrl: string | null;
  price: number;
  rating: number | null;
  ratingCount?: number;
  createdAt?: string;
  category?: { id: number; name: string; slug: string };
  brand?: { id: number; name: string };
  isInStock?: boolean;
  /** false = ngừng bán: ẩn khỏi storefront/ML, admin vẫn thấy và sửa được. */
  isActive?: boolean;
  detail?: Record<string, unknown> | null;
  rank?: number;
  score?: number;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ProductList = { items: Product[]; pagination: Pagination };

export type FeaturedList = {
  source: string;
  model: string | null;
  items: Product[];
};

export type SmartSearchResult = ProductList & {
  analysis: {
    hardConstraints?: {
      categories?: string[];
      brands?: string[];
      max_price?: number;
      min_price?: number;
      connectivity?: string[];
      max_weight_g?: number;
      layout?: string;
    };
    softTags?: string[];
  } | null;
};

export type User = {
  id: number;
  username: string;
  fullName?: string | null;
  email?: string;
  address?: string | null;
  role?: string;
};

export type Session = { user: User; token?: string };

export type CartLine = {
  productId: number;
  quantity: number;
  price?: number;
  lineTotal?: number;
  stockQuantity?: number | null;
  product?: Product;
  // dòng giỏ khách (localStorage)
  name?: string;
  imageUrl?: string | null;
  categorySlug?: string | null;
};

export type Cart = {
  items: CartLine[];
  subtotal: number;
  totalItems: number;
};

export type ShippingMethod = {
  id: string; // mã prefix, ví dụ "VC-0001"
  name: string;
  fee: number;
  estimatedDays?: string | null;
  isActive: boolean;
};

export type OrderItem = {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  product?: Product;
};

export type Order = {
  id: number;
  code?: string;
  status: "pending" | "confirmed" | "shipping" | "delivered" | "cancelled";
  createdAt: string;
  totalAmount: number;
  shippingAddress: string;
  shippingPhone?: string;
  shippingMethod?: { name: string };
  items: OrderItem[];
};

export type OrderList = { items: Order[]; pagination: Pagination };

/* ------------------------------- Trang quản trị ------------------------------- */

/** Đơn phía admin: thêm mã DH-, danh tính khách và trạng thái thanh toán. */
export type AdminOrder = {
  id: number;
  code: string;
  userId: number;
  status: Order["status"];
  paymentMethod?: string;
  paymentStatus?: string;
  totalAmount: number;
  shippingAddress: string;
  shippingPhone?: string;
  shippingMethodId?: string;
  shippingMethod?: ShippingMethod | null;
  createdAt: string;
  user?: { id: number; username: string; email: string } | null;
  items: OrderItem[];
};

export type AdminOrderList = { items: AdminOrder[]; pagination: Pagination };

export type AdminCustomer = {
  id: number;
  username: string;
  email: string;
  address: string | null;
  role: string;
  emailVerified: boolean;
  isLocked: boolean;
  createdAt: string;
  _count?: { orders: number };
};

export type AdminCustomerList = {
  items: AdminCustomer[];
  pagination: Pagination;
};

export type AdminReview = {
  id: string;
  content: string;
  createdAt: string;
  /** Điểm trung bình của sản phẩm tại lúc xem — nhận xét không lưu score riêng. */
  score: number | null;
  user: { id: number; username: string };
  product: { id: number; name: string; imageUrl: string | null; isActive: boolean };
};

export type AdminReviewList = { items: AdminReview[]; pagination: Pagination };

export type StatsOverview = {
  totalUsers: number;
  totalProducts: number;
  totalReviews?: number;
  ordersByStatus: Record<string, number>;
  deliveredOrders: number;
  revenue: number;
  awaitingPayment: number;
};

export type RevenuePoint = {
  period: string;
  periodLabel: string;
  orderCount: number;
  revenue: number;
};

export type TopProduct = {
  id: number;
  name: string;
  imageUrl: string | null;
  soldQuantity: number;
  revenue: number;
};

export type LowStockItem = {
  id: number;
  name: string;
  stockQuantity: number;
  price: number;
  brand: { id: number; name: string } | null;
};

export type MlStatus = {
  online: boolean;
  serviceUrl: string;
  detail: { status?: string; service?: string; version?: string } | null;
};

export type MlModel = {
  key: string;
  label: string;
  path: string;
  exists: boolean;
  loaded: boolean;
  loaded_at?: string | null;
  modified_at?: string | null;
  size_bytes?: number | null;
  manifest?: {
    version?: string;
    trained_at?: string;
    metrics?: Record<string, unknown>;
  } | null;
  error?: string | null;
};

export type MlDataset = {
  name: string;
  scope: "original" | "uploaded";
  size_bytes: number;
  modified_at: string;
};

/** Body của POST/PUT /api/products — bỏ trống trường nào thì giữ nguyên trường đó khi sửa. */
export type ProductInput = {
  categoryId?: number;
  brandId?: number;
  name?: string;
  color?: string;
  stockQuantity?: number;
  price?: number;
  imageUrl?: string;
  isActive?: boolean;
  detail?: Record<string, unknown> | null;
};

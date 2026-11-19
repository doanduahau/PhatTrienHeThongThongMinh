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
  status: "pending" | "confirmed" | "shipping" | "delivered" | "cancelled";
  createdAt: string;
  totalAmount: number;
  shippingAddress: string;
  shippingPhone?: string;
  shippingMethod?: { name: string };
  items: OrderItem[];
};

export type OrderList = { items: Order[]; pagination: Pagination };

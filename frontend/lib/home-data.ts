import { catalogApi } from "@/lib/api";
import type { Category, FeaturedList, Product, ProductList } from "@/lib/types";
import { pickPrimary } from "@/lib/nav-data";

const EMPTY: ProductList = {
  items: [],
  pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
};

/** Khối dữ liệu trang chủ — lỗi một khối không kéo sập cả trang. */
export async function getHomeData(): Promise<{
  featured: FeaturedList | null;
  categories: Category[];
  /** Sản phẩm đánh giá cao — nền của khối "Gợi ý cho bạn" khi chưa đăng nhập. */
  suggestions: Product[];
}> {
  const [featured, categories, topRated] = await Promise.all([
    catalogApi.featured(12).catch(() => null),
    catalogApi.categories().catch(() => [] as Category[]),
    catalogApi.products({ sort: "rating_desc", limit: 12 }).catch(() => EMPTY),
  ]);

  return {
    featured,
    categories: pickPrimary(categories),
    suggestions: topRated.items,
  };
}

import { catalogApi } from "@/lib/api";
import type { FeaturedList, Category } from "@/lib/types";

const PRIMARY_CATEGORIES = [
  "chuot",
  "ban-phim",
  "lot-chuot",
  "tai-nghe",
  "ghe",
  "phu-kien-cong-thai-hoc",
];

/** Khối dữ liệu trang chủ — lỗi một khối không kéo sập cả trang. */
export async function getHomeData(): Promise<{
  featured: FeaturedList | null;
  categories: Category[];
}> {
  const [featured, categories] = await Promise.all([
    catalogApi.featured(8).catch(() => null),
    catalogApi.categories().catch(() => [] as Category[]),
  ]);
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  return {
    featured,
    categories: PRIMARY_CATEGORIES.map((slug) => bySlug.get(slug)).filter(
      (category): category is Category => Boolean(category),
    ),
  };
}

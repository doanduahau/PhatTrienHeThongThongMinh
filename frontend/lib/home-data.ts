import { cache } from "react";
import { cookies } from "next/headers";
import { catalogApi } from "@/lib/api";
import { pickPrimary } from "@/lib/nav-data";
import { beFetch, COOKIE_NAME } from "@/lib/server-auth";
import type { FeaturedList } from "@/lib/types";

const RECOMMENDATION_LIMIT = 50;

export const getStorefrontRecommendations = cache(async (slug = "") => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token) {
    const { res, payload } = await beFetch("recommendations/for-you", {
      token,
      query: `?${new URLSearchParams({ limit: String(RECOMMENDATION_LIMIT), ...(slug ? { slug } : {}) })}`,
    });
    const data: FeaturedList | undefined = res.ok ? payload.data : undefined;
    if (data?.items.length) {
      return {
        items: data.items,
        title: data.source === "ml" ? "Gợi ý cho bạn" : "Gợi ý mua sắm",
      };
    }
  }

  const catalog = await catalogApi
    .products({ slug, sort: "rating_desc", limit: RECOMMENDATION_LIMIT })
    .catch(() => null);
  return { items: catalog?.items ?? [], title: "Gợi ý mua sắm" };
});

export async function getHomeData() {
  const [recommendations, featured, categories] = await Promise.all([
    getStorefrontRecommendations(),
    catalogApi.featured(12).catch(() => null),
    catalogApi.categories().catch(() => []),
  ]);

  return {
    recommendations,
    featuredProducts: featured?.items ?? [],
    categories: pickPrimary(categories),
  };
}

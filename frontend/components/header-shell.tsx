import { getGroup } from "@/lib/category-groups";
import { resolveImage } from "@/lib/format";
import { getStorefrontRecommendations } from "@/lib/home-data";
import { NAV_GROUPS } from "@/lib/nav-data";
import type { Product } from "@/lib/types";
import { Header } from "./header";

function getCards(products: Product[]) {
  return products.flatMap((product) => {
    const image = resolveImage(product.imageUrl);
    return image ? [{ title: product.name, href: `/san-pham/${product.id}`, image }] : [];
  }).slice(0, 3);
}

export async function HeaderShell() {
  const nav = await Promise.all(NAV_GROUPS.map(async (group) => {
    const slugs = getGroup(group.slug)?.slugs ?? [];
    if (!slugs.length) return group;

    const recommendations = await getStorefrontRecommendations(slugs.join(","));
    return {
      ...group,
      recommendations: { title: recommendations.title, cards: getCards(recommendations.items) },
    };
  }));

  return <Header nav={nav} />;
}

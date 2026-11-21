import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { catalogApi } from "@/lib/api";
import { getStorefrontRecommendations } from "@/lib/home-data";
import type { CategoryGroup } from "@/lib/category-groups";
import type { SmartSearchResult } from "@/lib/types";
import { money, resolveImage } from "@/lib/format";
import { Container, Skeleton } from "@/components/ui";
import { ProductGrid } from "@/components/product-card";
import { CategoryArt } from "@/components/category-art";
import { CategoryBanner } from "@/components/category-banner";
import { CategoryFilters } from "@/components/category-filters";
import { ProductSortSelect } from "@/components/product-sort";

export type Search = { [key: string]: string | string[] | undefined };

export const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const PAGE_SIZE = 12;

function describeAnalysis(analysis: SmartSearchResult["analysis"], query: string) {
  const constraints = analysis?.hardConstraints ?? {};
  const parts: string[] = [];
  if (constraints.categories?.length)
    parts.push(`danh mục ${constraints.categories.map((s) => s.replace(/-/g, " ")).join(", ")}`);
  if (constraints.brands?.length) parts.push(`hãng ${constraints.brands.join(", ")}`);
  if (constraints.max_price) parts.push(`giá dưới ${money(constraints.max_price)}`);
  if (constraints.min_price) parts.push(`giá trên ${money(constraints.min_price)}`);
  if (constraints.connectivity?.length) {
    const map: Record<string, string> = { wired: "có dây", wireless: "không dây", tri_mode: "3 chế độ" };
    parts.push(constraints.connectivity.map((code) => map[code] ?? code).join(" hoặc "));
  }
  if (constraints.max_weight_g) parts.push(`nặng dưới ${constraints.max_weight_g} g`);
  if (constraints.layout) parts.push(`layout ${constraints.layout}`);
  if (parts.length === 0)
    return `Chưa nhận ra ràng buộc nào trong “${query}”, đang tìm theo tên và thương hiệu.`;
  return `Hiểu là: ${parts.join(", ")}.`;
}

/** Nối `basePath` (danh mục nằm ở path) với các bộ lọc còn lại (nằm ở query). */
const hrefWith = (basePath: string, search: Search, overrides: Record<string, string> = {}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    const v = one(value);
    if (v && key !== "slug") params.set(key, v);
  }
  for (const [key, value] of Object.entries(overrides)) params.set(key, value);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
};

/** Số trang hiển thị: 3 trang đầu, 3 trang cuối, trang hiện tại và 2 trang kề nó, chỗ trống là "…". */
function pageItems(page: number, totalPages: number): (number | "…")[] {
  const wanted = new Set([
    1, 2, 3,
    totalPages - 2, totalPages - 1, totalPages,
    page - 1, page, page + 1,
  ]);
  const sorted = [...wanted]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

function ProductResultsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-44" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-80 w-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * Vùng duy nhất phụ thuộc searchParams (đếm + lưới + phân trang), nằm trong
 * Suspense riêng để đổi bộ lọc chỉ thay mỗi khối này, không đụng banner/lọc/nổi bật.
 */
async function ProductResults({
  slugs,
  basePath,
  search,
}: {
  slugs: string[];
  basePath: string;
  search: Search;
}) {
  const slugQuery = slugs.join(",");
  const page = Math.max(1, Number(one(search.page)) || 1);
  const brandId = one(search.brandId) ?? "";
  const sort = one(search.sort) ?? "newest";
  const q = one(search.q) ?? "";
  const smart = one(search.smart) === "1";
  const inStock = one(search.inStock) ?? "";
  const minPrice = one(search.minPrice) ?? "";
  const maxPrice = one(search.maxPrice) ?? "";
  const connectivity = one(search.connectivity) ?? "";
  const handOrientation = one(search.handOrientation) ?? "";
  const minWeight = one(search.minWeight) ?? "";
  const maxWeight = one(search.maxWeight) ?? "";
  const pollingRate = one(search.pollingRate) ?? "";
  const switchType = one(search.switchType) ?? "";
  const layout = one(search.layout) ?? "";
  const hasRapidTrigger = one(search.hasRapidTrigger) ?? "";
  const hasHotswap = one(search.hasHotswap) ?? "";
  const supportMacos = one(search.supportMacos) ?? "";
  const headphoneType = one(search.headphoneType) ?? "";
  const hasMic = one(search.hasMic) ?? "";
  const hasAnc = one(search.hasAnc) ?? "";
  const padType = one(search.padType) ?? "";
  const mouseControl = one(search.mouseControl) ?? "";
  const base = one(search.base) ?? "";
  const size = one(search.size) ?? "";
  const surface = one(search.surface) ?? "";
  const speed = one(search.speed) ?? "";
  const setupCategory = one(search.setupCategory) ?? "";
  const maxLoadKg = one(search.maxLoadKg) ?? "";

  let items: SmartSearchResult["items"] = [];
  let total = 0;
  let totalPages = 1;
  let analysisLine: string | null = null;
  let errorMessage: string | null = null;

  try {
    if (smart && q) {
      const data = await catalogApi.smartSearch({ q, page, limit: PAGE_SIZE });
      items = data.items;
      total = data.pagination.total;
      totalPages = data.pagination.totalPages;
      analysisLine = describeAnalysis(data.analysis, q);
    } else {
      const data = await catalogApi.products({
        page,
        limit: PAGE_SIZE,
        sort,
        brandId: brandId || undefined,
        slug: slugQuery || undefined,
        search: q || undefined,
        inStock: inStock || undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        connectivity: connectivity || undefined,
        handOrientation: handOrientation || undefined,
        minWeight: minWeight || undefined,
        maxWeight: maxWeight || undefined,
        pollingRate: pollingRate || undefined,
        switchType: switchType || undefined,
        layout: layout || undefined,
        hasRapidTrigger: hasRapidTrigger || undefined,
        hasHotswap: hasHotswap || undefined,
        supportMacos: supportMacos || undefined,
        headphoneType: headphoneType || undefined,
        hasMic: hasMic || undefined,
        hasAnc: hasAnc || undefined,
        padType: padType || undefined,
        mouseControl: mouseControl || undefined,
        base: base || undefined,
        size: size || undefined,
        surface: surface || undefined,
        speed: speed || undefined,
        setupCategory: setupCategory || undefined,
        maxLoadKg: maxLoadKg || undefined,
      });
      items = data.items;
      total = data.pagination.total;
      totalPages = data.pagination.totalPages;

      // ML chỉ dành cho trang tìm kiếm (/san-pham từ thanh tìm kiếm):
      // tìm text ra 0 kết quả thì fallback sang smart search.
      // Trang danh mục/bộ lọc không bao giờ gọi ML.
      if (q && items.length === 0 && slugs.length === 0) {
        const fallback = await catalogApi.smartSearch({
          q,
          page,
          limit: PAGE_SIZE,
        });
        if (fallback.items.length > 0) {
          items = fallback.items;
          total = fallback.pagination.total;
          totalPages = fallback.pagination.totalPages;
          analysisLine = describeAnalysis(fallback.analysis, q);
        }
      }
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Không thể tải sản phẩm.";
  }

  return (
    <div id="product-results-section">
      {/* Header đếm số lượng & sắp xếp */}
      <div className="mb-6 flex h-11 items-center justify-between gap-4 border-b border-line pb-4">
        <span className="text-base font-semibold leading-none text-ink">
          {total} sản phẩm
        </span>
        <ProductSortSelect defaultValue={sort} basePath={basePath} />
      </div>

      {analysisLine ? (
        <p aria-live="polite" className="mb-4 rounded-btn bg-accent-soft px-4 py-3 text-sm">
          {analysisLine}
        </p>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="rounded-card bg-subtle p-8 text-muted">{errorMessage}</p>
      ) : items.length === 0 ? (
        <div className="rounded-card bg-subtle p-12 text-center text-muted">
          <p className="text-base font-medium text-ink">Không có sản phẩm nào khớp bộ lọc này.</p>
          <p className="mt-1 text-sm">Hãy thử thay đổi hoặc đặt lại bộ lọc để xem nhiều sản phẩm hơn.</p>
          <Link
            href={basePath}
            className="mt-4 inline-block rounded-btn bg-accent px-4 py-2 text-sm font-medium text-accent-text"
          >
            Đặt lại bộ lọc
          </Link>
        </div>
      ) : (
        <ProductGrid products={items} className="md:grid-cols-2 2xl:grid-cols-3" />
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Phân trang"
          className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm"
        >
          {page > 1 ? (
            <Link href={hrefWith(basePath, search, { page: String(page - 1) })} scroll={false} className="rounded-btn border border-line px-4 py-2 hover:bg-subtle">
              Trang trước
            </Link>
          ) : null}
          {pageItems(page, totalPages).map((item, i) =>
            item === "…" ? (
              <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">
                …
              </span>
            ) : (
              <Link
                key={item}
                href={hrefWith(basePath, search, { page: String(item) })}
                scroll={false}
                aria-current={item === page ? "page" : undefined}
                className={`flex size-10 items-center justify-center rounded-btn border text-sm font-medium tabular-nums transition-colors ${
                  item === page
                    ? "border-accent bg-accent text-accent-text"
                    : "border-line hover:bg-subtle"
                }`}
              >
                {item}
              </Link>
            ),
          )}
          {page < totalPages ? (
            <Link href={hrefWith(basePath, search, { page: String(page + 1) })} scroll={false} className="rounded-btn border border-line px-4 py-2 hover:bg-subtle">
              Trang sau
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

/**
 * Khung trang danh mục dùng chung cho `/san-pham` (không lọc danh mục),
 * `/danh-muc/[slug]` (một danh mục) và `/danh-muc/[nhóm]` (nhiều danh mục gộp).
 * Phần không phụ thuộc bộ lọc (banner, sidebar lọc, cột nổi bật) render ở đây;
 * chỉ lưới sản phẩm nằm trong Suspense riêng.
 */
export async function CatalogView({
  slugs = [],
  group = null,
  basePath,
  search,
}: {
  slugs?: string[];
  group?: CategoryGroup | null;
  basePath: string;
  search: Search;
}) {
  const slugQuery = slugs.join(",");

  const [categories, brands, recommendations] = await Promise.all([
    catalogApi.categories().catch(() => []),
    catalogApi.brands(slugQuery ? { slug: slugQuery } : undefined).catch(() => []),
    getStorefrontRecommendations(slugQuery),
  ]);

  const currentCategory = slugs.length === 1
    ? categories.find((c) => c.slug === slugs[0]) ?? null
    : null;

  // Bảng xếp hạng featured của danh mục đang xem (toàn hệ thống cho trang nhóm),
  // thuật toán sắp xếp giảm dần; đổi sort/lọc không được làm nó đổi theo.
  const featuredItems = await catalogApi
    .featured(8, currentCategory?.id)
    .then((data) => data.items)
    .catch(() => [] as SmartSearchResult["items"]);
  const recommendedProduct = recommendations.items[0];
  const bannerRecommendation = recommendedProduct
    ? { product: recommendedProduct, title: recommendations.title }
    : null;

  return (
    <>
      <CategoryBanner
        category={group ?? currentCategory}
        recommendation={bannerRecommendation}
      />

      <Container className="grid items-start gap-8 py-10 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_19rem]">
        <CategoryFilters slugs={slugs} basePath={basePath} brands={brands} />

        <Suspense fallback={<ProductResultsSkeleton />}>
          <ProductResults slugs={slugs} basePath={basePath} search={search} />
        </Suspense>

        {featuredItems.length > 0 ? (
          <aside aria-labelledby="featured-heading" className="space-y-4">
            <h2 id="featured-heading" className="text-lg font-semibold text-ink">
              Sản phẩm nổi bật
            </h2>
            <ul className="space-y-3">
              {featuredItems.map((product) => {
                const image = resolveImage(product.imageUrl);
                return (
                  <li key={product.id}>
                    <Link
                      href={`/san-pham/${product.id}`}
                      className="group flex items-center gap-3 rounded-card border border-line bg-bg p-2.5 transition-colors hover:border-accent/40"
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-btn bg-subtle">
                        {image ? (
                          <Image
                            src={image}
                            alt={product.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <CategoryArt slug={product.category?.slug} className="absolute inset-0 m-auto size-7 text-muted" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink group-hover:text-accent">
                          {product.name}
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-ink">
                          {money(product.price)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>
        ) : null}
      </Container>
    </>
  );
}

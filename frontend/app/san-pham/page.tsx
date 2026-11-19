import Link from "next/link";
import { catalogApi } from "@/lib/api";
import type { SmartSearchResult } from "@/lib/types";
import { money } from "@/lib/format";
import { Container } from "@/components/ui";
import { ProductGrid } from "@/components/product-card";

export const metadata = { title: "Sản phẩm" };

const PAGE_SIZE = 9;

type Search = { [key: string]: string | string[] | undefined };

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

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

const pageHref = (search: Search, page: number) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    const v = one(value);
    if (v) params.set(key, v);
  }
  params.set("page", String(page));
  return `/san-pham?${params}`;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const page = Math.max(1, Number(one(search.page)) || 1);
  const slug = one(search.slug) ?? "";
  const brandId = one(search.brandId) ?? "";
  const sort = one(search.sort) ?? "newest";
  const q = one(search.q) ?? "";
  const smart = one(search.smart) === "1";

  const [categories, brands] = await Promise.all([
    catalogApi.categories().catch(() => []),
    catalogApi.brands().catch(() => []),
  ]);

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
        slug: slug || undefined,
        search: q || undefined,
      });
      items = data.items;
      total = data.pagination.total;
      totalPages = data.pagination.totalPages;
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Không thể tải sản phẩm.";
  }

  return (
    <>
      <section className="bg-subtle py-10">
        <Container>
          <nav aria-label="Đường dẫn" className="mb-3 flex gap-2 text-sm text-muted">
            <Link href="/" className="hover:text-accent">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Sản phẩm</span>
          </nav>
          <h1 className="text-3xl font-bold lg:text-4xl">Sản phẩm</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Lọc theo danh mục, thương hiệu hoặc mô tả bằng câu. Mọi thông số đều
            được ghi rõ để bạn chọn đúng ngay từ đầu.
          </p>
        </Container>
      </section>

      <Container className="grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Bộ lọc">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Bộ lọc</h2>
            <Link href="/san-pham" className="text-sm text-muted hover:text-accent">
              Đặt lại
            </Link>
          </div>
          <ul className="mb-6 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            <li className="list-none">
              <Link
                href="/san-pham"
                aria-current={!slug ? "true" : undefined}
                className={`block rounded-btn px-3 py-2 text-sm ${!slug ? "bg-accent-soft font-medium text-accent" : "hover:bg-subtle"}`}
              >
                Tất cả
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.id} className="list-none">
                <Link
                  href={`/san-pham?slug=${category.slug}`}
                  aria-current={slug === category.slug ? "true" : undefined}
                  className={`block rounded-btn px-3 py-2 text-sm ${slug === category.slug ? "bg-accent-soft font-medium text-accent" : "hover:bg-subtle"}`}
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>

          <form action="/san-pham" method="get" className="space-y-4">
            {slug ? <input type="hidden" name="slug" value={slug} /> : null}
            <div>
              <label htmlFor="filter-q" className="mb-1 block text-sm font-medium">
                Tìm theo tên, hãng hoặc câu mô tả
              </label>
              <input
                id="filter-q"
                name="q"
                type="search"
                defaultValue={q}
                autoComplete="off"
                placeholder="Ví dụ: chuột không dây"
                className="h-11 w-full rounded-btn border border-line px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="filter-brand" className="mb-1 block text-sm font-medium">
                Thương hiệu
              </label>
              <select
                id="filter-brand"
                name="brandId"
                defaultValue={brandId}
                className="h-11 w-full rounded-btn border border-line bg-bg px-3 text-sm"
              >
                <option value="">Tất cả</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-sort" className="mb-1 block text-sm font-medium">
                Sắp xếp
              </label>
              <select
                id="filter-sort"
                name="sort"
                defaultValue={sort}
                className="h-11 w-full rounded-btn border border-line bg-bg px-3 text-sm"
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
                <option value="name_asc">Tên A-Z</option>
                <option value="rating_desc">Đánh giá cao</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-smart" className="mb-1 block text-sm font-medium">
                Cách tìm
              </label>
              <select
                id="filter-smart"
                name="smart"
                defaultValue={smart ? "1" : "0"}
                className="h-11 w-full rounded-btn border border-line bg-bg px-3 text-sm"
              >
                <option value="0">Theo tên và hãng</option>
                <option value="1">Hiểu câu mô tả</option>
              </select>
            </div>
            <button
              type="submit"
              className="h-11 w-full rounded-btn bg-accent font-medium text-accent-text hover:bg-accent/90"
            >
              Lọc sản phẩm
            </button>
          </form>
        </aside>

        <div>
          <p role="status" aria-live="polite" className="mb-2 text-sm text-muted">
            {errorMessage ? "Không thể tải sản phẩm." : `${total} sản phẩm${smart && q ? " phù hợp" : ""}`}
          </p>
          {analysisLine ? (
            <p aria-live="polite" className="mb-4 rounded-btn bg-accent-soft px-4 py-3 text-sm">
              {analysisLine}
            </p>
          ) : null}
          {errorMessage ? (
            <p role="alert" className="rounded-card bg-subtle p-8 text-muted">{errorMessage}</p>
          ) : items.length === 0 ? (
            <p className="rounded-card bg-subtle p-8 text-muted">
              {smart && q
                ? "Không tìm thấy sản phẩm nào phù hợp. Hãy thử từ khóa khác."
                : "Không có sản phẩm nào khớp bộ lọc này."}
            </p>
          ) : (
            <ProductGrid products={items} className="md:grid-cols-2 lg:grid-cols-3" />
          )}
          {totalPages > 1 ? (
            <nav aria-label="Phân trang" className="mt-8 flex items-center justify-center gap-4 text-sm">
              {page > 1 ? (
                <Link href={pageHref(search, page - 1)} className="rounded-btn border border-line px-4 py-2 hover:bg-subtle">
                  Trang trước
                </Link>
              ) : null}
              <span className="text-muted">Trang {page} / {totalPages}</span>
              {page < totalPages ? (
                <Link href={pageHref(search, page + 1)} className="rounded-btn border border-line px-4 py-2 hover:bg-subtle">
                  Trang sau
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </Container>
    </>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { getHomeData } from "@/lib/home-data";
import { Container, SectionHeader, ProductGridSkeleton } from "@/components/ui";
import { ProductGrid } from "@/components/product-card";
import { CategoryArt } from "@/components/category-art";
import { HeroSlideshow } from "@/components/hero";
import { SmartSearchBand } from "@/components/smart-search";

const TRUST_ITEMS = [
  {
    title: "Hàng chính hãng",
    text: "Bảo hành theo hãng, tem niêm phong đầy đủ.",
    icon: (
      <>
        <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    title: "Giao nhanh 0–3 ngày",
    text: "Miễn phí ship từ 1 triệu trong nội thành.",
    icon: (
      <>
        <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
  },
  {
    title: "Đổi trả 7 ngày",
    text: "Đổi mới nếu lỗi kỹ thuật, hỗ trợ tận tình.",
    icon: <path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5" />,
  },
  {
    title: "Tư vấn thật",
    text: "Chọn theo nhu cầu, không chạy theo doanh số.",
    icon: (
      <>
        <path d="M4 13a8 8 0 0 1 16 0v3a3 3 0 0 1-3 3h-2" />
        <path d="M4 13h3v5H6a2 2 0 0 1-2-2v-3ZM20 13h-3v5h1a2 2 0 0 0 2-2v-3Z" />
      </>
    ),
  },
];

async function HomeContent() {
  const { featured, categories } = await getHomeData();
  const heroProducts = featured?.items ?? [];
  const bestSellers = heroProducts.slice(0, 4);

  return (
    <>
      <section aria-label="Sản phẩm nổi bật" className="pt-6">
        <Container>
          {heroProducts.length > 0 ? (
            <HeroSlideshow products={heroProducts} />
          ) : (
            <div className="rounded-card bg-subtle p-12">
              <h2 className="text-3xl font-bold lg:text-4xl">
                Gear gọn, chuẩn gu cho góc máy chơi game.
              </h2>
              <p className="mt-3 max-w-md text-muted">
                Chuột, bàn phím, tai nghe và ghế được chọn theo thông số thật,
                bảo hành rõ ràng.
              </p>
              <Link
                href="/san-pham"
                className="mt-6 inline-flex h-11 items-center rounded-btn bg-accent px-6 font-medium text-accent-text"
              >
                Xem sản phẩm
              </Link>
            </div>
          )}
        </Container>
      </section>

      {categories.length > 0 ? (
        <section className="py-12" aria-labelledby="category-heading">
          <Container>
            <SectionHeader
              id="category-heading"
              title="Danh mục gear"
              href="/san-pham"
              linkLabel="Xem tất cả"
            />
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {categories.map((category) => {
                const count = category._count?.products ?? 0;
                return (
                  <li key={category.id} className="list-none">
                    <Link
                      href={`/san-pham?slug=${category.slug}`}
                      className="flex h-full flex-col items-center gap-3 rounded-card border border-line p-5 text-center transition-colors hover:border-accent/40 hover:bg-subtle"
                    >
                      <CategoryArt slug={category.slug} className="size-10 text-ink" />
                      <span className="font-medium leading-snug">{category.name}</span>
                      <span className="text-xs text-muted">
                        {count > 0 ? `${count} sản phẩm` : "Sắp có"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Container>
        </section>
      ) : null}

      {bestSellers.length > 0 ? (
        <section className="bg-subtle py-12" aria-labelledby="featured-heading">
          <Container>
            <SectionHeader
              id="featured-heading"
              title="Gear bán chạy"
              href="/san-pham"
              linkLabel="Xem tất cả sản phẩm"
            />
            <ProductGrid products={bestSellers} />
          </Container>
        </section>
      ) : null}

      <SmartSearchBand />

      <section className="py-12" aria-label="Cam kết dịch vụ">
        <Container className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <article key={item.title} className="flex gap-4">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-7 shrink-0 text-accent"
                aria-hidden="true"
              >
                {item.icon}
              </svg>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">{item.text}</p>
              </div>
            </article>
          ))}
        </Container>
      </section>

      <section className="pb-14" aria-labelledby="showroom-heading">
        <Container className="grid items-center gap-8 lg:grid-cols-2">
          <div className="flex min-h-64 flex-col items-start justify-end rounded-card bg-subtle p-8">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-4 size-10 text-accent"
              aria-hidden="true"
            >
              <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <p className="font-semibold">Gear Shop Showroom</p>
            <p className="text-sm text-muted">89 Hồ Văn Huê, Phú Nhuận, TP.HCM</p>
          </div>
          <div className="space-y-4">
            <h2 id="showroom-heading" className="text-3xl font-bold">
              Ghé showroom để thử đúng cảm giác.
            </h2>
            <p className="text-muted">
              Cầm thử chuột, gõ thử switch, ngồi thử ghế và nghe thử tai nghe.
              Đội ngũ tư vấn sẽ giúp bạn chọn cấu hình phù hợp với cách chơi và
              không gian của mình.
            </p>
            <ul className="space-y-2 text-sm">
              {[
                "Trải nghiệm hơn 100 mẫu gear đang bày",
                "Đo và tư vấn setup theo bàn làm việc",
                "Hỗ trợ cài đặt, kiểm tra máy tại chỗ",
              ].map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <span className="text-accent" aria-hidden="true">✓</span>
                  {line}
                </li>
              ))}
            </ul>
            <Link
              href="/san-pham"
              className="inline-flex h-11 items-center rounded-btn bg-ink px-6 font-medium text-bg hover:bg-ink/90"
            >
              Xem sản phẩm trước
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}

function HomeSkeleton() {
  return (
    <Container className="space-y-10 py-6">
      <div className="h-80 animate-pulse rounded-card bg-subtle" />
      <ProductGridSkeleton />
    </Container>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

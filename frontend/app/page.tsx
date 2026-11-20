import { Suspense } from "react";
import { getHomeData } from "@/lib/home-data";
import { Container, SectionHeader, ProductGridSkeleton, ButtonLink } from "@/components/ui";
import { ProductGrid } from "@/components/product-card";
import { CategoryCarousel } from "@/components/category-carousel";
import { HeroSlideshow } from "@/components/hero";
import { SmartSearchBand } from "@/components/smart-search";
import { ForYouSection } from "@/components/for-you";

/** Cam kết — chỉ mô tả điều hệ thống thật sự làm được, không có số liệu tự đặt. */
const TRUST_ITEMS = [
  {
    title: "Giao hàng linh hoạt",
    text: "Tiêu chuẩn, nhanh hoặc hoả tốc theo từng đơn.",
    icon: (
      <>
        <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
  },
  {
    title: "Thanh toán khi nhận",
    text: "COD hoặc chuyển khoản, chọn ngay lúc đặt hàng.",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
      </>
    ),
  },
  {
    title: "Thông số ghi rõ",
    text: "Bảng thông số chi tiết cho từng sản phẩm.",
    icon: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  },
  {
    title: "Đồng bộ giỏ hàng",
    text: "Giỏ khách giữ trên máy, đăng nhập để đồng bộ.",
    icon: (
      <>
        <path d="M4 9a8 8 0 0 1 13.5-3.5L19 7.5M19 15a8 8 0 0 1-13.5 3.5L5 16.5" />
        <path d="M19 3.5v4h-4M5 20.5v-4h4" />
      </>
    ),
  },
];

function StaticHero() {
  return (
    <section className="pb-10 lg:pb-14">
      <Container className="pt-8 lg:pt-14">
        <h1 className="max-w-4xl text-display font-bold">
          Gear gọn, chuẩn gu cho góc máy chơi game.
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-muted">
          Chuột, bàn phím, tai nghe và ghế với thông số ghi rõ cho từng sản phẩm.
        </p>
        <div className="mt-7">
          <ButtonLink href="/san-pham">Xem sản phẩm</ButtonLink>
        </div>
      </Container>
    </section>
  );
}

async function HomeContent() {
  const { featured, categories, suggestions } = await getHomeData();
  const items = featured?.items ?? [];
  const heroProducts = items.slice(0, 3);
  const featuredProducts = items.slice(3, 11);

  // Không lặp lại sản phẩm đã xuất hiện ở hai khối trên.
  const shown = new Set(
    [...heroProducts, ...featuredProducts].map((product) => product.id),
  );
  const forYou = suggestions.filter((product) => !shown.has(product.id)).slice(0, 8);

  // Chuẩn bị danh sách ảnh chuyển liên tục cho SmartSearchBand (900x900)
  // Ưu tiên các sản phẩm nổi bật ML (items), sau đó tới gợi ý (suggestions)
  const searchSlides = [
    ...items.slice(0, 5).map((p) => ({ image: p.imageUrl, name: p.name })),
    ...suggestions.slice(0, 5).map((p) => ({ image: p.imageUrl, name: p.name })),
  ];
  if (searchSlides.length === 0) {
    searchSlides.push({
      image: "https://cdn.shopify.com/s/files/1/0636/9044/0949/products/chu-t-khong-day-sieu-nh-logitech-g-pro-x-superlight-wireless-37089285996789.jpg?v=1677194289",
      name: "Logitech G Pro X Superlight",
    });
  }

  return (
    <>
      {heroProducts.length > 0 ? (
        <HeroSlideshow products={heroProducts} />
      ) : (
        <StaticHero />
      )}

      <CategoryCarousel categories={categories} />

      {featuredProducts.length > 0 ? (
        <section className="bg-subtle py-12 lg:py-16" aria-labelledby="featured-heading">
          <Container>
            <SectionHeader
              id="featured-heading"
              title="Gear nổi bật"
              href="/san-pham"
              linkLabel="Xem tất cả sản phẩm"
            />
            <ProductGrid products={featuredProducts} className="md:grid-cols-3 lg:grid-cols-4" />
          </Container>
        </section>
      ) : null}

      <SmartSearchBand items={searchSlides} />

      <section className="py-12 lg:py-16" aria-label="Cam kết dịch vụ">
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
                className="size-7 shrink-0 text-ink"
                aria-hidden="true"
              >
                {item.icon}
              </svg>
              <div>
                <h3 className="text-h3 font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">{item.text}</p>
              </div>
            </article>
          ))}
        </Container>
      </section>

      <ForYouSection fallback={forYou} />
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

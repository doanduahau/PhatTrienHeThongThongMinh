import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Product } from "@/lib/types";
import { catalogApi, ApiError } from "@/lib/api";
import { money, resolveImage } from "@/lib/format";
import { Container, Rating, ColorDot, Skeleton } from "@/components/ui";
import { CategoryArt } from "@/components/category-art";
import { AddToCart } from "@/components/add-to-cart";

const DETAIL_LABELS: Record<string, string> = {
  connectivity: "Kết nối",
  handOrientation: "Kiểu cầm",
  weightG: "Trọng lượng",
  pollingRateHz: "Polling rate",
  switchType: "Loại switch",
  sensor: "Cảm biến",
  layout: "Layout",
  hasRapidTrigger: "Rapid trigger",
  hasHotswap: "Hot-swap",
  supportMacos: "Hỗ trợ macOS",
  switch: "Switch",
  headphoneType: "Kiểu tai nghe",
  hasMic: "Có micro",
  hasAnc: "Chống ồn",
  setupCategory: "Loại",
  maxLoadKg: "Tải trọng",
  padType: "Chất liệu",
  mouseControl: "Kiểu di chuột",
  speed: "Tốc độ",
  surface: "Bề mặt",
  base: "Đế",
  size: "Kích thước",
};

const VALUE_LABELS: Record<string, string> = {
  wired: "Có dây",
  wireless: "Không dây",
  tri_mode: "3 chế độ",
  wired_3_5mm: "Jack 3.5mm",
  "wired_3.5mm": "Jack 3.5mm",
  wireless_2_4g: "Không dây 2.4GHz",
  "wireless_2.4g": "Không dây 2.4GHz",
  bluetooth: "Bluetooth",
  symmetrical: "Đối xứng",
  ergonomic: "Công thái học",
  in_ear: "Nhét tai",
  over_ear: "Chụp tai",
  on_ear: "On-ear",
  soundcard: "Soundcard",
  chair: "Ghế",
  desk: "Bàn",
  arm: "Arm màn hình",
  accessory: "Phụ kiện",
};

const IGNORED_KEYS = new Set(["id", "productId", "createdAt"]);

function formatSpecValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (key === "weightG") return `${value} g`;
  if (key === "pollingRateHz") return `${value} Hz`;
  if (key === "maxLoadKg") return `${value} kg`;
  return VALUE_LABELS[String(value)] ?? String(value);
}

async function getProduct(id: number) {
  try {
    return await catalogApi.product(id);
  } catch (error) {
    if (error instanceof ApiError && error.httpStatus === 404) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(Number(id)).catch(() => null);
  return { title: product ? product.name : "Chi tiết sản phẩm" };
}

async function ProductDetail({ product }: { product: Product }) {
  // ML tắt vẫn có fallback ở server; nếu cả hai lỗi thì bỏ qua khối này.
  const similar = await catalogApi
    .similar(product.id, 6)
    .then((data) => data.items)
    .catch(() => []);

  const image = resolveImage(product.imageUrl);
  const available = product.stockQuantity > 0;
  const specs = Object.entries(product.detail ?? {})
    .filter(([key]) => !IGNORED_KEYS.has(key))
    .map(([key, value]) => [key, formatSpecValue(key, value)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== null);

  return (
    <>
      <Container className="py-8">
        <section className="grid items-start gap-10 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_19rem]" aria-labelledby="product-name">
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-card border border-line bg-bg">
            {image ? (
              <Image
                src={image}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
                className="object-cover"
              />
            ) : (
              <CategoryArt slug={product.category?.slug} className="size-28 text-muted" />
            )}
          </div>

          <div className="space-y-4">
            {product.brand?.name ? (
              <p className="text-sm font-medium text-muted">{product.brand.name}</p>
            ) : null}
            <h1 id="product-name" className="text-3xl font-bold leading-tight lg:text-4xl">
              {product.name}
            </h1>
            <Rating value={product.rating} count={product.ratingCount} />
            <p className="border-b border-line pb-4 text-3xl font-bold text-ink tabular-nums">
              {money(product.price)}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {available ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-sm font-medium text-danger">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-danger" />
                  Chỉ còn {product.stockQuantity} sản phẩm
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-danger/10 px-3 py-1 text-sm font-medium text-danger">
                  Hết hàng
                </span>
              )}
              <ColorDot color={product.color} />
            </div>

            <AddToCart product={product} />

            <div className="rounded-card bg-subtle px-4 pt-4">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4 text-accent"
                  aria-hidden="true"
                >
                  <path d="M20.6 12.6 12 4H4v8l8.6 8.6a2 2 0 0 0 2.8 0l5.2-5.2a2 2 0 0 0 0-2.8Z" />
                  <circle cx="7.5" cy="7.5" r="1" />
                </svg>
                Chính sách &amp; quyền lợi
              </h2>
              <ul className="divide-y divide-line">
                <li>
                  <Link
                    href="/giao-hang"
                    className="flex items-center justify-between py-2 text-sm font-medium text-ink hover:text-accent"
                  >
                    Giao nhanh 0–3 ngày, miễn phí ship từ 1 triệu
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/doi-tra-bao-hanh"
                    className="flex items-center justify-between py-2 text-sm font-medium text-ink hover:text-accent"
                  >
                    Đổi trả 7 ngày, bảo hành chính hãng
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/lien-he"
                    className="flex items-center justify-between py-2 text-sm font-medium text-ink hover:text-accent"
                  >
                    Hỗ trợ &amp; tư vấn
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
              </ul>
            </div>

            {specs.length > 0 ? (
              <div className="border-t border-line pt-4">
                <h2 className="mb-3 text-lg font-semibold">Thông số</h2>
                <table className="w-full text-sm">
                  <caption className="sr-only">Thông số kỹ thuật</caption>
                  <tbody>
                    {specs.map(([key, value]) => (
                      <tr key={key} className="border-b border-line last:border-0">
                        <th scope="row" className="py-2.5 pr-4 text-left font-medium text-muted">
                          {DETAIL_LABELS[key] ?? key}
                        </th>
                        <td className="py-2.5">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          {similar.length > 0 ? (
            <aside aria-labelledby="similar-heading" className="space-y-4">
              <h2 id="similar-heading" className="text-lg font-semibold text-ink">
                Sản phẩm tương tự
              </h2>
              <ul className="space-y-3">
                {similar.map((item) => {
                  const thumb = resolveImage(item.imageUrl);
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/san-pham/${item.id}`}
                        className="group flex items-center gap-3 rounded-card border border-line bg-bg p-2.5 transition-colors hover:border-accent/40"
                      >
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-btn bg-subtle">
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt={item.name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <CategoryArt
                              slug={item.category?.slug}
                              className="absolute inset-0 m-auto size-7 text-muted"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink group-hover:text-accent">
                            {item.name}
                          </p>
                          <p className="text-sm font-semibold tabular-nums text-ink">
                            {money(item.price)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </aside>
          ) : null}
        </section>
      </Container>
    </>
  );
}

export default async function ProductDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const numericId = Number(id);
  // notFound() phải chạy ngoài Suspense — bên trong boundary nó revert cả segment về trang trắng.
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const product = await getProduct(numericId);
  if (!product) notFound();

  return (
    <Suspense
      fallback={
        <Container className="py-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </Container>
      }
    >
      <ProductDetail product={product} />
    </Suspense>
  );
}

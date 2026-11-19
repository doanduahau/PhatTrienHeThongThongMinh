import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { catalogApi, ApiError } from "@/lib/api";
import { money, resolveImage } from "@/lib/format";
import { Container, SectionHeader, Rating, ColorDot } from "@/components/ui";
import { ProductGrid } from "@/components/product-card";
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

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const product = await getProduct(numericId);
  if (!product) notFound();

  // ML tắt vẫn có fallback ở server; nếu cả hai lỗi thì bỏ qua khối này.
  const similar = await catalogApi
    .similar(product.id, 4)
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
        <nav aria-label="Đường dẫn" className="mb-6 flex flex-wrap gap-2 text-sm text-muted">
          <Link href="/" className="hover:text-accent">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <Link href="/san-pham" className="hover:text-accent">Sản phẩm</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="truncate">{product.name}</span>
        </nav>

        <section className="grid gap-10 lg:grid-cols-2" aria-labelledby="product-name">
          <div className="relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-card bg-subtle">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={product.name}
                width={600}
                height={400}
                fetchPriority="high"
                className="size-full object-cover"
              />
            ) : (
              <CategoryArt slug={product.category?.slug} className="size-28 text-muted" />
            )}
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted">
              {product.brand?.name ?? "Gear Shop"}
              {product.category?.name ? ` · ${product.category.name}` : ""}
            </p>
            <h1 id="product-name" className="text-3xl font-bold lg:text-4xl">
              {product.name}
            </h1>
            <Rating value={product.rating} />
            <p className="text-2xl font-semibold text-accent">{money(product.price)}</p>
            <ColorDot color={product.color} />
            <p className={`text-sm ${available ? "text-muted" : "text-danger"}`}>
              {available ? `Còn ${product.stockQuantity} trong kho` : "Hết hàng"}
            </p>

            <AddToCart product={product} />

            <ul className="space-y-2 border-t border-line pt-4 text-sm text-muted">
              <li>Bảo hành chính hãng, tem niêm phong đầy đủ</li>
              <li>Giao nhanh 0–3 ngày, miễn phí ship từ 1 triệu</li>
              <li>Đổi trả 7 ngày nếu lỗi kỹ thuật</li>
            </ul>

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
        </section>
      </Container>

      {similar.length > 0 ? (
        <section className="bg-subtle py-12" aria-labelledby="similar-heading">
          <Container>
            <SectionHeader id="similar-heading" title="Sản phẩm tương tự" />
            <ProductGrid products={similar} />
          </Container>
        </section>
      ) : null}
    </>
  );
}

import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { money, resolveImage } from "@/lib/format";
import { ColorDot, Rating } from "./ui";
import { CategoryArt } from "./category-art";
import { QuickAdd } from "./quick-add";

/**
 * Ảnh + tên + giá. Toàn bộ card là một link (pseudo-element phủ hết card),
 * nút thêm nhanh nằm ngoài link nên vẫn bấm được.
 */
export function ProductCard({ product }: { product: Product }) {
  const image = resolveImage(product.imageUrl);
  // List API chỉ trả `isInStock`; chi tiết mới có `stockQuantity` → thiếu số lượng thì vẫn còn hàng.
  const out =
    product.isInStock === false ||
    (product.stockQuantity != null && product.stockQuantity <= 0);
  return (
    <li className="relative list-none">
      <Link
        href={`/san-pham/${product.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-bg transition-colors after:absolute after:inset-0 after:content-[''] hover:border-accent/40"
      >
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-subtle">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover"
            />
          ) : (
            <CategoryArt slug={product.category?.slug} className="absolute inset-0 m-auto size-16 text-muted" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <p className="text-xs text-muted">
            {product.category?.name ?? product.brand?.name ?? "Gear Shop"}
          </p>
          <p className="font-medium leading-snug group-hover:text-accent">
            {product.name}
          </p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2">
            <span className="font-semibold tabular-nums">{money(product.price)}</span>
            <Rating value={product.rating} count={product.ratingCount} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <ColorDot color={product.color} />
            <span className={`text-xs ${out ? "text-danger" : "text-muted"}`}>
              {out ? "Tạm hết" : "Sẵn hàng"}
            </span>
          </div>
        </div>
      </Link>
      <QuickAdd product={product} className="absolute right-3 top-3 z-10" />
    </li>
  );
}

export function ProductGrid({
  products,
  className = "",
}: {
  products: Product[];
  className?: string;
}) {
  return (
    <ul
      className={`grid grid-cols-2 gap-4 lg:gap-6 ${className}`}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </ul>
  );
}

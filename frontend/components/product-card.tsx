import Link from "next/link";
import type { Product } from "@/lib/types";
import { money, resolveImage } from "@/lib/format";
import { ColorDot, Rating } from "./ui";
import { CategoryArt } from "./category-art";

/** Ảnh + tên + giá. Toàn bộ card là một link, không nút riêng. */
export function ProductCard({ product }: { product: Product }) {
  const image = resolveImage(product.imageUrl);
  const out = product.isInStock === false;
  return (
    <li className="list-none">
      <Link
        href={`/san-pham/${product.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-bg transition-colors hover:border-accent/40"
      >
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-subtle">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={product.name}
              width={600}
              height={400}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <CategoryArt slug={product.category?.slug} className="absolute inset-0 m-auto size-16 text-muted" />
          )}
          {out ? (
            <span className="absolute left-3 top-3 rounded-btn bg-ink/80 px-2 py-1 text-xs font-medium text-bg">
              Hết hàng
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <p className="text-xs text-muted">
            {product.category?.name ?? product.brand?.name ?? "Gear Shop"}
          </p>
          <p className="font-medium leading-snug group-hover:text-accent">
            {product.name}
          </p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <span className="font-semibold">{money(product.price)}</span>
            <Rating value={product.rating} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <ColorDot color={product.color} />
            <span className={`text-xs ${out ? "text-danger" : "text-muted"}`}>
              {out ? "Tạm hết" : "Sẵn hàng"}
            </span>
          </div>
        </div>
      </Link>
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
      className={`grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6 ${className}`}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </ul>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import type { CartLineView } from "./store";
import { money, resolveImage } from "@/lib/format";
import { CategoryArt } from "./category-art";

function Thumb({ line, size }: { line: CartLineView; size: number }) {
  const image = resolveImage(line.imageUrl);
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-card bg-subtle"
      style={{ width: size, height: size }}
    >
      {image ? (
        <Image
          src={image}
          alt={line.name}
          width={size}
          height={size}
          className="size-full object-cover"
        />
      ) : (
        <CategoryArt slug={line.categorySlug} className="size-9 text-muted" />
      )}
    </div>
  );
}

function Stepper({
  line,
  onStep,
  compact = false,
}: {
  line: CartLineView;
  onStep: (productId: number, delta: number) => void;
  compact?: boolean;
}) {
  const hit = compact ? "size-9" : "size-11";
  return (
    <div className="flex items-center rounded-btn border border-line">
      <button
        type="button"
        aria-label={`Giảm số lượng ${line.name}`}
        onClick={() => onStep(line.productId, -1)}
        className={`flex ${hit} items-center justify-center hover:bg-subtle`}
      >
        −
      </button>
      <output aria-live="polite" className="w-7 text-center text-sm">
        {line.quantity}
      </output>
      <button
        type="button"
        aria-label={`Tăng số lượng ${line.name}`}
        onClick={() => onStep(line.productId, 1)}
        className={`flex ${hit} items-center justify-center hover:bg-subtle`}
      >
        +
      </button>
    </div>
  );
}

/** Dòng giỏ đầy đủ cho trang /gio-hang. */
export function CartLineRow({
  line,
  onStep,
  onRemove,
}: {
  line: CartLineView;
  onStep: (productId: number, delta: number) => void;
  onRemove: (productId: number) => void;
}) {
  return (
    <article className="grid grid-cols-[88px_1fr_auto] items-center gap-4 border-b border-line py-4 last:border-0">
      <Thumb line={line} size={88} />
      <div>
        <Link href={`/san-pham/${line.productId}`} className="font-medium hover:text-accent">
          {line.name}
        </Link>
        <p className="text-sm text-muted">{money(line.price)} mỗi cái</p>
        <div className="mt-2 flex items-center gap-4">
          <Stepper line={line} onStep={onStep} />
          <button
            type="button"
            onClick={() => onRemove(line.productId)}
            className="text-sm text-muted hover:text-danger"
          >
            Xoá
          </button>
        </div>
      </div>
      <p className="text-right font-semibold tabular-nums">{money(line.lineTotal)}</p>
    </article>
  );
}

/** Dòng giỏ gọn cho drawer. */
export function CartLineCompact({
  line,
  onStep,
  onRemove,
}: {
  line: CartLineView;
  onStep: (productId: number, delta: number) => void;
  onRemove: (productId: number) => void;
}) {
  return (
    <article className="flex gap-3 border-b border-line py-4 last:border-0">
      <Thumb line={line} size={80} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/san-pham/${line.productId}`}
          className="line-clamp-2 text-sm font-medium hover:text-accent"
        >
          {line.name}
        </Link>
        <p className="mt-0.5 text-sm text-muted">{money(line.price)}</p>
        <button
          type="button"
          onClick={() => onRemove(line.productId)}
          className="mt-2 text-sm text-muted hover:text-danger"
        >
          Xoá
        </button>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Stepper line={line} onStep={onStep} compact />
        <p className="text-sm font-semibold tabular-nums">{money(line.lineTotal)}</p>
      </div>
    </article>
  );
}

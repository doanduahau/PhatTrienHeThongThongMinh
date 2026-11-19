"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { money, resolveImage } from "@/lib/format";
import { ButtonLink } from "./ui";
import { CategoryArt } from "./category-art";

const HERO_COPY: Record<string, { title: string; lead: string }> = {
  chuot: {
    title: "Chuột nhẹ, phản hồi nhanh cho mọi trận đấu.",
    lead: "Chọn theo cỡ tay, trọng lượng và kiểu cầm. Cảm biến và kết nối được ghi rõ để bạn không phải đoán.",
  },
  "ban-phim": {
    title: "Bàn phím đúng layout, gõ đúng cảm giác.",
    lead: "Từ 65% gọn gàng đến TKL đủ phím. Switch, hành trình và rapid trigger đều có thông số cụ thể.",
  },
  "lot-chuot": {
    title: "Mặt lót mượt, kiểm soát chính xác từng pha.",
    lead: "Chọn theo kích thước, bề mặt và tốc độ di chuột để hợp với cảm giác chơi của bạn.",
  },
  "tai-nghe": {
    title: "Nghe rõ hướng, thoải mái khi chơi lâu.",
    lead: "Tai nghe có dây, không dây và chống ồn. Chọn theo kiểu đeo, micro và nhu cầu sử dụng.",
  },
  ghe: {
    title: "Ngồi đúng tư thế, chơi đủ dài.",
    lead: "Lưng lưới, tựa đầu và tải trọng được ghi rõ. Thử trực tiếp tại showroom trước khi chọn.",
  },
  "phu-kien-cong-thai-hoc": {
    title: "Những chi tiết nhỏ giúp góc máy gọn hơn.",
    lead: "Kê tay, arm màn hình và phụ kiện bàn làm việc giúp giảm mỏi và sắp xếp không gian.",
  },
};

const DEFAULT_COPY = {
  title: "Gear gọn, chuẩn gu cho góc máy chơi game.",
  lead: "Chuột, bàn phím, tai nghe và ghế được chọn theo thông số thật, bảo hành rõ ràng.",
};

export function HeroSlideshow({ products }: { products: Product[] }) {
  const slides = products.slice(0, 3);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    if (
      paused ||
      slides.length <= 1 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    timer.current = setInterval(
      () => setCurrent((value) => (value + 1) % slides.length),
      6500,
    );
  }, [paused, slides.length, stop]);

  useEffect(() => {
    start();
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [start, stop]);

  if (slides.length === 0) return null;

  const go = (next: number) => {
    setCurrent((next + slides.length) % slides.length);
    start();
  };

  return (
    <div
      className="relative overflow-hidden rounded-card bg-subtle"
      onMouseEnter={stop}
      onMouseLeave={start}
      onFocusCapture={stop}
      onBlurCapture={start}
    >
      {slides.map((product, index) => {
        const slug = product.category?.slug ?? "";
        const copy = HERO_COPY[slug] ?? DEFAULT_COPY;
        const image = resolveImage(product.imageUrl);
        const active = index === current;
        return (
          <article
            key={product.id}
            aria-hidden={!active}
            className={`${active ? "relative opacity-100" : "pointer-events-none absolute inset-0 opacity-0"} grid gap-6 p-6 transition-opacity duration-300 md:grid-cols-2 md:p-12`}
          >
            <div className="flex flex-col justify-center gap-4">
              <p className="text-sm font-medium text-accent">
                {product.category?.name ?? "Gear chính hãng"}
              </p>
              <h2 className="text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
                {copy.title}
              </h2>
              <p className="max-w-md text-muted">{copy.lead}</p>
              <p className="text-lg">
                <span className="text-muted">Từ </span>
                <span className="font-semibold">{money(product.price)}</span>
              </p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href={`/san-pham/${product.id}`}>
                  Xem chi tiết
                </ButtonLink>
                <ButtonLink
                  variant="ghost"
                  href={slug ? `/san-pham?slug=${slug}` : "/san-pham"}
                >
                  Khám phá danh mục
                </ButtonLink>
              </div>
            </div>
            <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-card bg-bg">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={product.name}
                  width={600}
                  height={400}
                  className="size-full object-cover"
                />
              ) : (
                <CategoryArt slug={slug} className="size-28 text-muted" />
              )}
              <Link
                href={`/san-pham/${product.id}`}
                className="absolute bottom-4 left-4 rounded-btn bg-bg/95 px-4 py-2 text-sm shadow-sm"
              >
                <span className="block font-medium">{product.name}</span>
                <span className="text-accent">{money(product.price)}</span>
              </Link>
            </div>
          </article>
        );
      })}

      {slides.length > 1 ? (
        <div className="flex items-center justify-center gap-2 pb-5">
          <button
            type="button"
            aria-label="Slide trước"
            onClick={() => go(current - 1)}
            className="flex size-10 items-center justify-center rounded-btn border border-line bg-bg hover:bg-subtle"
          >
            ‹
          </button>
          <div role="tablist" aria-label="Chọn slide" className="flex gap-1">
            {slides.map((product, index) => (
              <button
                key={product.id}
                type="button"
                role="tab"
                aria-selected={index === current}
                aria-label={`Slide ${index + 1}: ${product.name}`}
                onClick={() => go(index)}
                className={`h-10 rounded-btn px-3 text-sm ${index === current ? "bg-accent text-accent-text" : "bg-bg text-muted hover:bg-subtle"}`}
              >
                {String(index + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Slide sau"
            onClick={() => go(current + 1)}
            className="flex size-10 items-center justify-center rounded-btn border border-line bg-bg hover:bg-subtle"
          >
            ›
          </button>
          <button
            type="button"
            aria-pressed={paused}
            aria-label={paused ? "Tiếp tục tự động chuyển slide" : "Tạm dừng tự động chuyển slide"}
            onClick={() => setPaused((value) => !value)}
            className="flex size-10 items-center justify-center rounded-btn border border-line bg-bg text-xs hover:bg-subtle"
          >
            {paused ? "▶" : "❚❚"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

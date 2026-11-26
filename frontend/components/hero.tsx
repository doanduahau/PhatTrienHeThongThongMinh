"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { resolveImage } from "@/lib/format";
import Link from "next/link";
import Image from "next/image";
import { CategoryArt } from "./category-art";

const HERO_COPY: Record<string, string> = {
  chuot: "Chuột nhẹ, phản hồi nhanh cho mọi trận đấu.",
  "ban-phim": "Bàn phím đúng layout, gõ đúng cảm giác.",
  "lot-chuot": "Mặt lót mượt, kiểm soát chính xác từng pha.",
  "tai-nghe": "Nghe rõ hướng, thoải mái khi chơi lâu.",
  ghe: "Ngồi đúng tư thế, chơi đủ dài.",
  "phu-kien-cong-thai-hoc": "Những chi tiết nhỏ giúp góc máy gọn hơn.",
};

const DEFAULT_COPY = "Gear gọn, chuẩn gu cho góc máy chơi game.";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      {direction === "left" ? <path d="m14.5 6-6 6 6 6" /> : <path d="m9.5 6 6 6-6 6" />}
    </svg>
  );
}

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

  const active = slides[current];
  const copy = HERO_COPY[active.category?.slug ?? ""] ?? DEFAULT_COPY;

  return (
    <section
      aria-label="Sản phẩm nổi bật"
      className="group relative w-full overflow-hidden bg-ink"
      onMouseEnter={stop}
      onMouseLeave={start}
      onFocusCapture={stop}
      onBlurCapture={start}
    >
      {/* Bù 108px của header cố định để mép dưới khớp với banner trang danh mục. */}
      <div className="relative h-[calc(clamp(26rem,100svh_-_19rem,46rem)_+_108px)] w-full">
        {/* Lớp ảnh: crossfade giữa các slide */}
        {slides.map((product, index) => {
          const image = resolveImage(product.imageUrl);
          return (
            <div
              key={product.id}
              aria-hidden={index !== current}
              className={`absolute inset-0 transition-opacity duration-500 ${index === current ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              {image ? (
                <Image
                  src={image}
                  alt={product.name}
                  fill
                  sizes="100vw"
                  priority={index === 0}
                  unoptimized={image.startsWith("http:")}
                  className="object-cover brightness-[.78]"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-ink">
                  <CategoryArt slug={product.category?.slug} className="size-28 text-bg/40" />
                </div>
              )}
            </div>
          );
        })}

        {/* Lớp tối riêng quanh khối chữ để đọc được, không phủ đều lên ảnh */}
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,rgba(0,0,0,0.6),transparent_75%)]"
          aria-hidden="true"
        />
        {/* dải tối trên đỉnh để chữ header trong suốt đọc được */}
        <div
          className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/60 to-transparent"
          aria-hidden="true"
        />

        {/* Chữ overlay: một h1 + một dòng phụ + một CTA, căn giữa */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-5 text-center text-bg">
          <h1 className="max-w-3xl text-display font-bold">{active.name}</h1>
          <p className="max-w-xl text-lead text-bg/85">{copy}</p>
          <Link
            href={`/san-pham/${active.id}`}
            className="mt-2 inline-flex h-12 items-center rounded-btn bg-bg px-8 font-medium text-ink transition-colors hover:bg-bg/90"
          >
            Xem chi tiết
          </Link>
        </div>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Slide trước"
              onClick={() => go(current - 1)}
              className="absolute left-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-bg/90 text-ink opacity-0 transition-opacity duration-150 hover:bg-bg focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Chevron direction="left" />
            </button>
            <button
              type="button"
              aria-label="Slide sau"
              onClick={() => go(current + 1)}
              className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-bg/90 text-ink opacity-0 transition-opacity duration-150 hover:bg-bg focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Chevron direction="right" />
            </button>

            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <div role="tablist" aria-label="Chọn slide" className="flex gap-2">
                {slides.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    role="tab"
                    aria-selected={index === current}
                    aria-label={`Slide ${index + 1}: ${product.name}`}
                    onClick={() => go(index)}
                    className={`flex size-10 items-center justify-center rounded-full text-sm font-medium tabular-nums transition-colors ${index === current ? "bg-bg text-ink" : "bg-bg/15 text-bg hover:bg-bg/25"}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-pressed={paused}
                aria-label={paused ? "Tiếp tục tự động chuyển slide" : "Tạm dừng tự động chuyển slide"}
                onClick={() => setPaused((value) => !value)}
                className="flex size-10 items-center justify-center rounded-full bg-bg/15 text-bg transition-colors hover:bg-bg/25"
              >
                {paused ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
                    <path d="M8 5.5 18 12 8 18.5Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-4" aria-hidden="true">
                    <path d="M9.5 5.5v13M14.5 5.5v13" />
                  </svg>
                )}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Container } from "./ui";

const SUGGESTIONS = [
  "chuột không dây dưới 2 triệu",
  "bàn phím 75% có rapid trigger",
  "tai nghe chống ồn dưới 3 triệu",
  "ghế công thái học lưng lưới",
];

type SearchSlideItem = {
  image: string;
  name: string;
  href: string;
};

export function SmartSearchBand({ items, title }: { items: SearchSlideItem[]; title: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const activeSlide = items[currentIndex] ?? items[0];

  useEffect(() => {
    if (items.length <= 1 || hovered || focused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [items.length, hovered, focused]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query =
      new FormData(event.currentTarget).get("q")?.toString().trim() ?? "";
    if (!query) return;
    router.push(`/san-pham?q=${encodeURIComponent(query)}&smart=1`);
  };

  return (
    <section id="tim-kiem" aria-labelledby="tim-kiem-heading" className="bg-ink py-12 text-bg lg:py-16">
      <Container
        className={`grid items-center gap-8 md:gap-12 ${activeSlide ? "md:grid-cols-2" : ""}`}
      >
        {activeSlide ? (
          <div className="flex items-center justify-center md:order-last">
            <div
              className="relative aspect-[4/3] w-full max-w-[340px] overflow-hidden rounded-card bg-bg shadow-lg sm:aspect-square sm:max-w-[460px] md:max-w-[650px]"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onFocus={() => setFocused(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
              }}
            >
              {items.map((slide, index) => (
                <Image
                  key={slide.href}
                  src={slide.image}
                  alt=""
                  fill
                  preload={index === 0}
                  sizes="(min-width: 1024px) 650px, (min-width: 640px) 460px, 340px"
                  unoptimized={slide.image.startsWith("http:")}
                  className={`object-contain transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${
                    slide === activeSlide ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
              <Link
                href={activeSlide.href}
                className="group absolute inset-0 z-10 flex flex-col justify-end gap-1 bg-linear-to-t from-black/85 via-black/40 via-25% to-transparent to-50% px-4 pb-12 pt-4 text-white focus-visible:-outline-offset-4"
              >
                <span className="text-xs font-medium">{title}</span>
                <span className="font-semibold group-hover:underline">{activeSlide.name}</span>
              </Link>

              {items.length > 1 ? (
                <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-sm">
                  {items.map((slide, index) => (
                    <button
                      key={slide.href}
                      type="button"
                      aria-label={`Xem ${slide.name}`}
                      aria-current={slide === activeSlide}
                      onClick={() => setCurrentIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        slide === activeSlide
                          ? "w-5 bg-white"
                          : "w-2 bg-white/50 hover:bg-white/75"
                      }`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="space-y-4 md:order-first">
          <h2 id="tim-kiem-heading" className="text-2xl sm:text-3xl md:text-h1 font-bold">
            Chưa biết chọn gì? Mô tả thứ bạn cần.
          </h2>
          <p className="max-w-md text-sm sm:text-base text-bg/70">
            Nói theo cách của bạn: ngân sách, kiểu kết nối, layout bàn phím hay
            trọng lượng chuột. Hệ thống gợi ý gear đúng nhu cầu, không phải đoán.
          </p>
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
            <label className="sr-only" htmlFor="smart-query">Câu mô tả</label>
            <input
              ref={inputRef}
              id="smart-query"
              name="q"
              type="search"
              placeholder="chuột không dây dưới 2 triệu"
              autoComplete="off"
              required
              className="h-11 sm:h-12 w-full rounded-btn border border-white/20 bg-white/10 px-4 text-bg placeholder:text-bg/50 focus:border-accent focus:outline-none"
            />
            <Button type="submit" size="lg" className="shrink-0 h-11 sm:h-12">
              Tìm sản phẩm
            </Button>
          </form>
          <div className="flex flex-wrap gap-2" aria-label="Gợi ý tìm kiếm">
            {SUGGESTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  if (inputRef.current) {
                    inputRef.current.value = tag;
                    inputRef.current.focus();
                  }
                }}
                className="rounded-btn border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-bg/80 transition-colors hover:border-accent hover:text-accent-soft"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

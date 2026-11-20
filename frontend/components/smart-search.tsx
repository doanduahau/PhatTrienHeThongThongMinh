"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Container } from "./ui";
import { resolveImage } from "@/lib/format";

const SUGGESTIONS = [
  "chuột không dây dưới 2 triệu",
  "bàn phím 75% có rapid trigger",
  "tai nghe chống ồn dưới 3 triệu",
  "ghế công thái học lưng lưới",
];

export type SearchSlideItem = {
  image?: string | null;
  name?: string;
};

export function SmartSearchBand({
  items,
  image,
  imageAlt,
}: {
  items?: SearchSlideItem[];
  image?: string | null;
  imageAlt?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Chuẩn bị danh sách ảnh hợp lệ
  const slides = (
    items && items.length > 0
      ? items
      : [{ image, name: imageAlt }]
  )
    .map((item) => ({
      src: resolveImage(item.image),
      alt: item.name ?? "Gear Shop",
    }))
    .filter((item): item is { src: string; alt: string } => Boolean(item.src));

  const [currentIndex, setCurrentIndex] = useState(0);

  // Chuyển ảnh liên tục sau mỗi 3 giây
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query =
      new FormData(event.currentTarget).get("q")?.toString().trim() ?? "";
    if (!query) return;
    router.push(`/san-pham?q=${encodeURIComponent(query)}&smart=1`);
  };

  const hasSlides = slides.length > 0;

  return (
    <section id="tim-kiem" aria-labelledby="tim-kiem-heading" className="bg-ink py-12 text-bg lg:py-16">
      <Container
        className={`grid items-center gap-8 md:gap-12 ${hasSlides ? "md:grid-cols-2" : ""}`}
      >
        {hasSlides ? (
          <div className="flex items-center justify-center md:order-last">
            {/* Khung ảnh: Trên desktop tối đa 650px vuông 1:1, trên mobile/tablet hạ chiều cao tối đa gọn gàng aspect-[4/3] hoặc max-h-[360px] */}
            <div className="relative aspect-[4/3] sm:aspect-square w-full max-w-[340px] sm:max-w-[460px] md:max-w-[650px] max-h-[300px] sm:max-h-[460px] md:max-h-[650px] overflow-hidden rounded-card bg-subtle/10 shadow-lg">
              {slides.map((slide, idx) => (
                <div
                  key={`${slide.src}-${idx}`}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    idx === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    width={650}
                    height={650}
                    priority={idx === 0}
                    sizes="(min-width: 1024px) 650px, (min-width: 640px) 460px, 340px"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              ))}

              {/* Chấm chỉ số slide nếu có nhiều hơn 1 ảnh */}
              {slides.length > 1 ? (
                <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Slide ${idx + 1}`}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentIndex
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

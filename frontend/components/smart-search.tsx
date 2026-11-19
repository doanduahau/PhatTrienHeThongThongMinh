"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, type FormEvent } from "react";
import { Button, Container } from "./ui";
import { resolveImage } from "@/lib/format";

const SUGGESTIONS = [
  "chuột không dây dưới 2 triệu",
  "bàn phím 75% có rapid trigger",
  "tai nghe chống ồn dưới 3 triệu",
  "ghế công thái học lưng lưới",
];

export function SmartSearchBand({
  image,
  imageAlt,
}: {
  image?: string | null;
  imageAlt?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const src = resolveImage(image);

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
        className={`grid items-center gap-8 md:gap-12 ${src ? "md:grid-cols-2" : ""}`}
      >
        {src ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-bg">
            <Image
              src={src}
              alt={imageAlt ?? "Gear Shop"}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}
        <div className="space-y-4">
          <h2 id="tim-kiem-heading" className="text-h1 font-bold">
            Chưa biết chọn gì? Mô tả thứ bạn cần.
          </h2>
          <p className="max-w-md text-bg/70">
            Nói theo cách của bạn: ngân sách, kiểu kết nối, layout bàn phím hay
            trọng lượng chuột. Hệ thống gợi ý gear đúng nhu cầu, không phải đoán.
          </p>
          <form onSubmit={submit} className="flex gap-2">
            <label className="sr-only" htmlFor="smart-query">Câu mô tả</label>
            <input
              ref={inputRef}
              id="smart-query"
              name="q"
              type="search"
              placeholder="chuột không dây dưới 2 triệu"
              autoComplete="off"
              required
              className="h-12 w-full rounded-btn border border-white/20 bg-white/10 px-4 text-bg placeholder:text-bg/50 focus:border-accent focus:outline-none"
            />
            <Button type="submit" size="lg" className="shrink-0">
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

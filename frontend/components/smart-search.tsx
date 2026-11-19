"use client";

import { useRouter } from "next/navigation";
import { useRef, type FormEvent } from "react";
import { Button } from "./ui";

const SUGGESTIONS = [
  "chuột không dây dưới 2 triệu",
  "bàn phím 75% có rapid trigger",
  "tai nghe chống ồn dưới 3 triệu",
  "ghế công thái học lưng lưới",
];

export function SmartSearchBand() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query =
      new FormData(event.currentTarget).get("q")?.toString().trim() ?? "";
    if (!query) return;
    router.push(`/san-pham?q=${encodeURIComponent(query)}&smart=1`);
  };

  return (
    <section id="tim-kiem" aria-labelledby="tim-kiem-heading" className="bg-ink py-14 text-bg">
      <div className="mx-auto grid w-full max-w-shell gap-8 px-5 lg:grid-cols-2 lg:px-10">
        <div className="space-y-3">
          <h2 id="tim-kiem-heading" className="text-3xl font-bold lg:text-4xl">
            Chưa biết chọn gì? Mô tả thứ bạn cần.
          </h2>
          <p className="max-w-md text-bg/70">
            Nói theo cách của bạn: ngân sách, kiểu kết nối, layout bàn phím hay
            trọng lượng chuột.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-4">
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
              className="h-12 w-full rounded-btn border border-bg/20 bg-bg/10 px-4 text-bg placeholder:text-bg/50"
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
                className="rounded-full border border-bg/20 px-3 py-1.5 text-xs text-bg/80 hover:bg-bg/10"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

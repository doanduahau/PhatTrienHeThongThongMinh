"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ProductSortSelect({
  defaultValue = "newest",
  basePath = "/san-pham",
}: {
  defaultValue?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.delete("page");
    params.delete("slug");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span className="whitespace-nowrap font-medium text-ink/70">Sắp xếp:</span>
      <div className="relative inline-flex items-center">
        <select
          value={defaultValue}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none cursor-pointer rounded-btn border border-line bg-bg py-1.5 pl-3 pr-8 text-sm font-medium text-ink transition-colors hover:border-line-hover focus:border-accent focus:outline-none"
        >
          <option value="newest">Mới nhất</option>
          <option value="rating_desc">Đánh giá cao</option>
          <option value="price_asc">Giá: Thấp đến cao</option>
          <option value="price_desc">Giá: Cao đến thấp</option>
          <option value="name_asc">Tên: A đến Z</option>
        </select>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute right-2.5 size-4 text-muted"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

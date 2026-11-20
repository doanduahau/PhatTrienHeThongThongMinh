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
      <select
        value={defaultValue}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-btn border border-line bg-bg px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-line-hover focus:border-accent focus:outline-none"
      >
        <option value="newest">Mới nhất</option>
        <option value="rating_desc">Đánh giá cao</option>
        <option value="price_asc">Giá: Thấp đến cao</option>
        <option value="price_desc">Giá: Cao đến thấp</option>
        <option value="name_asc">Tên: A đến Z</option>
      </select>
    </div>
  );
}

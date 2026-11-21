import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CatalogView, one, type Search } from "@/components/catalog-view";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Tất cả sản phẩm" };

async function ProductsResults({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const slug = one(search.slug);

  // URL cũ kiểu /san-pham?slug=… → về trang danh mục dùng path.
  if (slug) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(search)) {
      const v = one(value);
      if (v && key !== "slug") params.set(key, v);
    }
    const qs = params.toString();
    redirect(`/danh-muc/${slug}${qs ? `?${qs}` : ""}`);
  }

  return <CatalogView basePath="/san-pham" search={search} />;
}

export default function ProductsPage(props: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-shell space-y-6 px-5 py-10 lg:px-10">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <ProductsResults {...props} />
    </Suspense>
  );
}

import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { catalogApi } from "@/lib/api";
import { getGroup } from "@/lib/category-groups";
import { CatalogView, type Search } from "@/components/catalog-view";
import { Skeleton } from "@/components/ui";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

type RouteProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Search>;
};

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) return { title: "Sản phẩm" };
  const group = getGroup(slug);
  if (group) return { title: group.name };
  const categories = await catalogApi.categories().catch(() => []);
  const current = categories.find((category) => category.slug === slug);
  return { title: current?.name ?? "Sản phẩm" };
}

async function CategoryResults({
  params,
  searchParams,
}: RouteProps) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();

  // Slug trang nhóm (gaming-gear, office-gear) gộp nhiều danh mục; còn lại là một danh mục.
  const group = getGroup(slug);
  if (!group) {
    const categories = await catalogApi.categories().catch(() => []);
    // Chỉ 404 khi đọc được danh mục mà không có slug này; API lỗi thì để trang trống hiển thị.
    if (categories.length > 0 && !categories.some((category) => category.slug === slug)) {
      notFound();
    }
  }

  const search = await searchParams;
  return (
    <CatalogView
      slugs={group?.slugs ?? [slug]}
      group={group}
      basePath={`/danh-muc/${slug}`}
      search={search}
    />
  );
}

export default function CategoryPage(props: RouteProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-shell space-y-6 px-5 py-10 lg:px-10">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <CategoryResults {...props} />
    </Suspense>
  );
}

import { ProductGridSkeleton, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-shell space-y-8 px-5 py-10 lg:px-10">
      <Skeleton className="h-10 w-64" />
      <ProductGridSkeleton count={8} />
    </div>
  );
}

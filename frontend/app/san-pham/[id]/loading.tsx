import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-shell px-5 py-8 lg:px-10">
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="grid gap-10 lg:grid-cols-2">
        <Skeleton className="aspect-[3/2] w-full" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-shell space-y-6 px-5 py-10 lg:px-10">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

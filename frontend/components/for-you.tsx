"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";
import { useStore } from "./store";
import { Container, ProductGridSkeleton, SectionHeader } from "./ui";
import { ProductGrid } from "./product-card";

export function ForYouSection({ fallback }: { fallback: Product[] }) {
  const { ready, user } = useStore();
  const [remote, setRemote] = useState<Product[] | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    void api
      .forYou(8)
      .then((data) => {
        if (!cancelled) setRemote(data.items.length > 0 ? data.items : fallback);
      })
      .catch(() => {
        if (!cancelled) setRemote(fallback);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user, fallback]);

  if (!ready || (user && remote === null)) {
    return (
      <section className="bg-subtle py-12 lg:py-16" aria-hidden="true">
        <Container className="space-y-6">
          <div className="h-10 w-64 animate-pulse rounded-card bg-line/60" />
          <ProductGridSkeleton />
        </Container>
      </section>
    );
  }

  const items = user ? (remote ?? []) : fallback;
  if (items.length === 0) return null;

  return (
    <section className="bg-subtle py-12 lg:py-16" aria-labelledby="for-you-heading">
      <Container>
        <SectionHeader
          id="for-you-heading"
          title="Gợi ý cho bạn"
          href="/san-pham"
          linkLabel="Xem tất cả"
        />
        <ProductGrid products={items} className="md:grid-cols-3 lg:grid-cols-4" />
      </Container>
    </section>
  );
}

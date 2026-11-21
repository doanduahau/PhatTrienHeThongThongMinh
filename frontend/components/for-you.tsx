import type { Product } from "@/lib/types";
import { Container, SectionHeader } from "./ui";
import { ProductGrid } from "./product-card";

export function ForYouSection({ products, title }: { products: Product[]; title: string }) {
  if (products.length === 0) return null;

  return (
    <section className="bg-subtle py-12 lg:py-16" aria-labelledby="for-you-heading">
      <Container>
        <SectionHeader
          id="for-you-heading"
          title={title}
          href="/san-pham"
          linkLabel="Xem tất cả sản phẩm"
        />
        <ProductGrid products={products} className="md:grid-cols-3 lg:grid-cols-4" />
      </Container>
    </section>
  );
}

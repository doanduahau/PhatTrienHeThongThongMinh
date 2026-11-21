import type { Metadata } from "next";
import ProductsClient from "./products-client";

export const metadata: Metadata = { title: "Sản phẩm" };
export const instant = false;

export default function AdminProductsPage() {
  return <ProductsClient />;
}

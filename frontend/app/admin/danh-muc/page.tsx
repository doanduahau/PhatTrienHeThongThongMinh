import type { Metadata } from "next";
import CategoriesClient from "./categories-client";

export const metadata: Metadata = { title: "Danh mục" };
export const instant = false;

export default function AdminCategoriesPage() {
  return <CategoriesClient />;
}

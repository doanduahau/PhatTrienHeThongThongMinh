import type { Metadata } from "next";
import BrandsClient from "./brands-client";

export const metadata: Metadata = { title: "Thương hiệu" };
export const instant = false;

export default function AdminBrandsPage() {
  return <BrandsClient />;
}

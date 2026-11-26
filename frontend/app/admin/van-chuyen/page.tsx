import type { Metadata } from "next";
import ShippingClient from "./shipping-client";

export const metadata: Metadata = { title: "Vận chuyển" };
export const instant = false;

export default function AdminShippingPage() {
  return <ShippingClient />;
}

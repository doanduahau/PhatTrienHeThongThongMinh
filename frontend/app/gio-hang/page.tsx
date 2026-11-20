import type { Metadata } from "next";
import CartClient from "./cart-client";

export const metadata: Metadata = { title: "Giỏ hàng" };

export default function CartPage() {
  return <CartClient />;
}

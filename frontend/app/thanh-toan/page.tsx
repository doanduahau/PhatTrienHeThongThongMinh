import type { Metadata } from "next";
import CheckoutClient from "./checkout-client";

export const metadata: Metadata = { title: "Thanh toán" };

export default function CheckoutPage() {
  return <CheckoutClient />;
}

import type { Metadata } from "next";
import OrdersClient from "./orders-client";

export const metadata: Metadata = { title: "Đơn hàng" };
export const instant = false;

export default function AdminOrdersPage() {
  return <OrdersClient />;
}

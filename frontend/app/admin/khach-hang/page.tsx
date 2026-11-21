import type { Metadata } from "next";
import CustomersClient from "./customers-client";

export const metadata: Metadata = { title: "Khách hàng" };
export const instant = false;

export default function AdminCustomersPage() {
  return <CustomersClient />;
}

import type { Metadata } from "next";
import DashboardClient from "./dashboard-client";

export const metadata: Metadata = { title: "Quản trị" };
export const instant = false;

export default function AdminDashboardPage() {
  return <DashboardClient />;
}

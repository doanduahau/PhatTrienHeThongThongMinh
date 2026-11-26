import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/shell";
import { AdminGate } from "@/components/admin/gate";

export const metadata: Metadata = {
  title: { default: "Quản trị", template: "%s · Quản trị" },
  robots: { index: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <Suspense
        fallback={<div className="h-72 animate-pulse rounded-card bg-subtle" aria-hidden="true" />}
      >
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </AdminShell>
  );
}

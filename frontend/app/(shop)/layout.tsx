import { Suspense } from "react";
import { HeaderShell } from "@/components/header-shell";
import { Footer } from "@/components/footer";

/** Chrome của trang bán hàng: header mega-menu, một cột nội dung, footer. */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<div className="h-24 bg-bg" aria-hidden="true" />}>
        <HeaderShell />
      </Suspense>
      <main id="main" className="flex-1 min-h-[60vh]">
        {children}
      </main>
      <Footer />
    </>
  );
}

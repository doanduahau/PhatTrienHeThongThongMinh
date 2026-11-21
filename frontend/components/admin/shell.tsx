"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useStore } from "@/components/store";
import { Container } from "@/components/ui";

const NAV = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/don-hang", label: "Đơn hàng" },
  { href: "/admin/san-pham", label: "Sản phẩm" },
  { href: "/admin/khach-hang", label: "Khách hàng" },
  { href: "/admin/nhan-xet", label: "Nhận xét" },
  { href: "/admin/danh-muc", label: "Danh mục" },
  { href: "/admin/thuong-hieu", label: "Thương hiệu" },
  { href: "/admin/van-chuyen", label: "Vận chuyển" },
  { href: "/admin/ml", label: "Gợi ý & ML" },
];

const isCurrent = (pathname: string, href: string) =>
  href === "/admin" ? pathname === href : pathname.startsWith(href);

/**
 * Khung riêng cho khu quản trị: header một dòng + cột điều hướng, không dùng
 * header/footer của trang bán hàng. Quyền thật do backend chặn; lớp chặn UX
 * nằm ở AdminGate (server) và trả 404.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useStore();
  const contentRef = useRef<HTMLElement>(null);
  const active = NAV.find((item) => isCurrent(pathname, item.href)) ?? NAV[0];

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
      <header className="shrink-0 border-b border-line bg-bg">
        <Container className="flex h-14 items-center gap-4">
          <Link href="/admin" className="flex shrink-0 items-center gap-2 font-bold">
            Gear Shop
            <span className="rounded-pill bg-ink px-2 py-0.5 text-[11px] font-medium text-bg">
              Quản trị
            </span>
          </Link>
          <h1 className="hidden truncate text-sm text-muted sm:block">{active.label}</h1>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/" className="text-sm text-muted hover:text-accent">
              Về cửa hàng
            </Link>
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
            >
              {user ? user.username.slice(0, 2).toUpperCase() : "GS"}
            </span>
            <span className="hidden text-sm font-medium md:inline">{user?.username}</span>
            <button
              type="button"
              onClick={async () => {
                if (!await logout()) return;
                router.push("/dang-nhap");
                router.refresh();
              }}
              className="rounded-btn border border-line px-3 py-1.5 text-sm hover:bg-subtle"
            >
              Đăng xuất
            </button>
          </div>
        </Container>
      </header>

      <Container className="grid gap-8 py-8 lg:min-h-0 lg:flex-1 lg:grid-cols-[240px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:py-0">
        <aside aria-label="Chuyên mục quản trị" className="h-fit space-y-1 lg:max-h-full lg:overflow-y-auto lg:py-8">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
              className={`block rounded-btn px-3 py-2 text-sm ${
                isCurrent(pathname, item.href)
                  ? "bg-accent-soft font-medium text-accent"
                  : "hover:bg-subtle"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </aside>
        <main
          id="main"
          ref={contentRef}
          tabIndex={0}
          className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:overscroll-y-contain lg:py-8"
        >
          {children}
        </main>
      </Container>
    </div>
  );
}

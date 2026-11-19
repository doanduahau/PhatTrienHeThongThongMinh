"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useStore } from "./store";
import { Container } from "./ui";

function Wordmark() {
  return (
    <Link href="/" aria-label="Gear Shop — về trang chủ" className="flex items-center gap-2">
      <svg viewBox="0 0 40 40" fill="none" className="size-9 text-ink" aria-hidden="true">
        <circle cx="20" cy="20" r="17.5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M26 14.5A8 8 0 1 0 26 25.5V20h-5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="31" cy="9" r="2.5" className="fill-accent" />
      </svg>
      <span className="text-lg font-bold">Gear Shop</span>
    </Link>
  );
}

function SearchForm({ className = "", onDone }: { className?: string; onDone?: () => void }) {
  const router = useRouter();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value =
      new FormData(event.currentTarget).get("q")?.toString().trim() ?? "";
    router.push(value ? `/san-pham?q=${encodeURIComponent(value)}` : "/san-pham");
    onDone?.();
  };
  return (
    <form role="search" onSubmit={submit} className={`flex items-center gap-2 rounded-btn border border-line bg-subtle px-3 ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 shrink-0 text-muted" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m16.5 16.5 4 4" />
      </svg>
      <input
        type="search"
        name="q"
        placeholder="Tìm chuột, bàn phím..."
        aria-label="Tìm sản phẩm"
        className="h-10 w-full bg-transparent text-sm outline-none"
      />
    </form>
  );
}

const NAV_LINKS = [
  { href: "/san-pham", label: "Sản phẩm" },
  { href: "/gio-hang", label: "Giỏ hàng" },
  { href: "/don-hang", label: "Đơn hàng" },
];

export function Header() {
  const { user, cartCount, logout, ready } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Đóng menu khi chuyển trang — so sánh trong lúc render thay vì effect.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || (href === "/san-pham" && pathname.startsWith("/san-pham"));

  const accountHref = user ? "/don-hang" : "/dang-nhap";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <div className="bg-ink text-bg">
        <Container className="flex h-8 items-center justify-center gap-3 text-xs">
          <span>Giao nhanh 0–3 ngày</span>
          <span aria-hidden="true">•</span>
          <span>Miễn phí ship từ 1 triệu</span>
          <span aria-hidden="true" className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Bảo hành gọn, xử lý nhanh</span>
        </Container>
      </div>
      <Container className="flex h-16 items-center gap-4">
        <Wordmark />
        <nav aria-label="Chính" className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`text-sm ${isActive(link.href) ? "text-accent underline underline-offset-8" : "text-ink hover:text-accent"}`}
            >
              {link.label}
              {link.href === "/gio-hang" && ready && cartCount > 0 ? ` (${cartCount})` : ""}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchForm className="hidden w-64 md:flex" />
          <Link
            href={accountHref}
            aria-label={user ? `Tài khoản ${user.username}` : "Đăng nhập"}
            className="flex size-11 items-center justify-center rounded-btn hover:bg-subtle"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-5" aria-hidden="true">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c.8-3.5 3.5-5.5 7-5.5s6.2 2 7 5.5" />
            </svg>
          </Link>
          <Link
            href="/gio-hang"
            aria-label="Giỏ hàng"
            className="relative flex size-11 items-center justify-center rounded-btn hover:bg-subtle"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
              <path d="M5 8h14l-1 12H6L5 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {ready && cartCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-text">
                {cartCount}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Đóng menu" : "Mở menu"}
            onClick={() => setOpen((value) => !value)}
            className="flex size-11 items-center justify-center rounded-btn hover:bg-subtle lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-5" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </Container>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav
            aria-label="Menu di động"
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-1 bg-bg p-5 shadow-lg lg:hidden"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng menu"
                className="flex size-10 items-center justify-center rounded-btn text-2xl hover:bg-subtle"
              >
                ×
              </button>
            </div>
            <SearchForm onDone={() => setOpen(false)} />
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-btn px-3 py-2.5 hover:bg-subtle"
              >
                {link.label}
                {link.href === "/gio-hang" && ready && cartCount > 0 ? ` (${cartCount})` : ""}
              </Link>
            ))}
            <Link href={accountHref} className="rounded-btn px-3 py-2.5 hover:bg-subtle">
              {user ? user.username : "Đăng nhập"}
            </Link>
            {user ? (
              <button
                type="button"
                className="rounded-btn px-3 py-2.5 text-left text-danger hover:bg-subtle"
                onClick={() => {
                  logout();
                  router.push("/dang-nhap");
                }}
              >
                Đăng xuất
              </button>
            ) : null}
          </nav>
        </>
      ) : null}
    </header>
  );
}

"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useStore } from "./store";
import { Container } from "./ui";
import { INFO_LINKS, type NavGroup } from "@/lib/nav-data";

function Wordmark({ isTransparent = false }: { isTransparent?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Gear Shop — về trang chủ"
      className="flex shrink-0 items-center gap-2 transition-colors duration-200"
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className={`size-10 transition-colors duration-200 ${
          isTransparent ? "text-white" : "text-ink"
        }`}
        aria-hidden="true"
      >
        <circle cx="20" cy="20" r="17.5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M26 14.5A8 8 0 1 0 26 25.5V20h-5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={`text-xl font-bold transition-colors duration-200 ${
          isTransparent ? "text-white" : "text-ink"
        }`}
      >
        Gear Shop
      </span>
    </Link>
  );
}

function SearchForm({
  className = "",
  isTransparent = false,
  onDone,
}: {
  className?: string;
  isTransparent?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value =
      new FormData(event.currentTarget).get("q")?.toString().trim() ?? "";
    router.push(value ? `/san-pham?q=${encodeURIComponent(value)}` : "/san-pham");
    onDone?.();
  };
  return (
    <form
      role="search"
      onSubmit={submit}
      className={`flex items-center gap-2 rounded-btn border px-3 transition-colors duration-200 ${
        isTransparent
          ? "border-white/20 bg-white/10 text-white placeholder:text-white/60 focus-within:border-white/40 focus-within:bg-white/15"
          : "border-line bg-subtle text-ink focus-within:border-accent"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={`size-4 shrink-0 transition-colors duration-200 ${
          isTransparent ? "text-white/70" : "text-muted"
        }`}
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m16.5 16.5 4 4" />
      </svg>
      <input
        type="search"
        name="q"
        placeholder="Tìm chuột, bàn phím..."
        aria-label="Tìm sản phẩm"
        className={`h-11 w-full bg-transparent text-[15px] outline-none transition-colors duration-200 ${
          isTransparent
            ? "text-white placeholder:text-white/60"
            : "text-ink placeholder:text-muted"
        }`}
      />
    </form>
  );
}

/** Một nhóm topbar: link mở mega-menu (cột danh mục + link tìm kiếm con) khi hover hoặc focus. */
function NavGroupItem({
  group,
  isActive,
  isTransparent = false,
}: {
  group: NavGroup;
  isActive?: boolean;
  isTransparent?: boolean;
}) {
  return (
    <div
      className="group relative flex h-[4.5rem] items-center"
      onClick={() => (document.activeElement as HTMLElement | null)?.blur()}
    >
      <Link
        href={group.viewAll.href}
        aria-current={isActive ? "page" : undefined}
        className={`flex items-center gap-0.5 whitespace-nowrap text-base font-medium transition-colors duration-200 ${
          isActive
            ? "text-accent underline underline-offset-8"
            : isTransparent
            ? "text-white/90 hover:text-white"
            : "text-ink hover:text-accent"
        }`}
      >
        {group.name}
        <span className="flex w-0 shrink-0 items-center overflow-visible ps-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3 opacity-70 transition-transform duration-200 group-hover:rotate-180"
            aria-hidden="true"
          >
            <path d="m6 9.5 6 6 6-6" />
          </svg>
        </span>
      </Link>
      <div className="pointer-events-none absolute left-0 top-full z-50 w-max max-w-[64rem] pt-2 opacity-0 transition-[opacity,transform] delay-75 duration-200 ease-out group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        <div
          className="grid -translate-y-1 rounded-card border border-line bg-bg p-6 shadow-float transition-transform duration-200 ease-out group-hover:translate-y-0 group-focus-within:translate-y-0"
          style={{
            gridTemplateColumns: `minmax(12rem, 1fr) repeat(${Math.min(group.columns.length, 4)}, minmax(10rem, 13rem))`,
          }}
        >
          <div className="flex flex-col gap-1 border-e border-line pe-6">
            <span className="text-lg font-semibold text-ink">
              {group.name}
            </span>
            <Link
              href={group.viewAll.href}
              className="mt-1 inline-flex items-center gap-1 text-[15px] font-medium text-accent hover:underline"
            >
              {group.viewAll.label}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="m9.5 6 6 6-6 6" />
              </svg>
            </Link>
          </div>
          {group.columns.map((column) => (
            <div key={column.name} className="flex flex-col gap-1 ps-6">
              <Link
                href={column.href}
                className="mb-1 text-[15px] font-semibold text-ink hover:text-accent"
              >
                {column.name}
              </Link>
              {column.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="min-w-0 truncate rounded-btn text-[15px] text-muted transition-colors duration-150 hover:text-accent"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Link trang thường trên topbar (Liên hệ, Giao hàng…). */
function NavPlainItem({
  href,
  label,
  isTransparent = false,
}: {
  href: string;
  label: string;
  isTransparent?: boolean;
}) {
  const active = usePathname() === href;
  return (
    <div className="flex h-[4.5rem] items-center">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`whitespace-nowrap text-base font-medium transition-colors duration-200 ${
          active
            ? "text-accent underline underline-offset-8"
            : isTransparent
            ? "text-white/90 hover:text-white"
            : "text-ink hover:text-accent"
        }`}
      >
        {label}
      </Link>
    </div>
  );
}

const ANNOUNCEMENTS = [
  "Giao nhanh 0–3 ngày",
  "Miễn phí ship từ 1 triệu",
  "Bảo hành gọn, xử lý nhanh",
];

/** Thanh thông báo: nền đen đặc cố định, một tin hiện tại, tự xoay vòng, có mũi tên và nút tạm dừng. */
function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = ANNOUNCEMENTS.length;

  useEffect(() => {
    if (paused || count <= 1) return;
    const timer = setInterval(
      () => setIndex((value) => (value + 1) % count),
      4000,
    );
    return () => clearInterval(timer);
  }, [paused, count]);

  const go = (next: number) => setIndex((next + count) % count);
  const control =
    "flex size-7 shrink-0 items-center justify-center rounded-full text-bg opacity-0 transition-[background-color,opacity] duration-200 hover:bg-bg/15 group-hover/ann:opacity-70 group-hover/ann:hover:opacity-100 group-focus-within/ann:opacity-70 focus-visible:opacity-100";

  return (
    <div className="group/ann bg-ink text-bg">
      <Container className="flex h-9 items-center justify-center gap-2 text-[13px] font-medium">
        <button
          type="button"
          aria-label="Tin trước"
          onClick={() => go(index - 1)}
          className={control}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="m14.5 6-6 6 6 6" />
          </svg>
        </button>
        <div className="relative min-w-0 flex-1 overflow-hidden text-center">
          {ANNOUNCEMENTS.map((message, i) => (
            <span
              key={message}
              aria-hidden={i !== index}
              className={`block whitespace-nowrap transition-opacity duration-300 ${
                i === index ? "opacity-100" : "absolute inset-0 opacity-0"
              }`}
            >
              {message}
            </span>
          ))}
        </div>
        <button
          type="button"
          aria-label="Tin sau"
          onClick={() => go(index + 1)}
          className={control}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="m9.5 6 6 6-6 6" />
          </svg>
        </button>
        <button
          type="button"
          aria-pressed={paused}
          aria-label={
            paused ? "Tiếp tục chạy tin" : "Tạm dừng chạy tin tự động"
          }
          onClick={() => setPaused((value) => !value)}
          className={control}
        >
          {paused ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
              aria-hidden="true"
            >
              <path d="M8 5.5 18 12 8 18.5Z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="size-4"
              aria-hidden="true"
            >
              <path d="M9.5 5.5v13M14.5 5.5v13" />
            </svg>
          )}
        </button>
      </Container>
    </div>
  );
}

const DRAWER_LINKS = [{ href: "/don-hang", label: "Đơn hàng" }];

export function Header({ nav }: { nav: NavGroup[] }) {
  const { user, cartCount, cartOpen, logout, ready, openCart } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const currentSlug = pathname.startsWith("/danh-muc/")
    ? decodeURIComponent(pathname.slice("/danh-muc/".length))
    : "";
  const isGroupActive = (group: NavGroup) =>
    currentSlug !== "" &&
    (group.viewAll.href === `/danh-muc/${currentSlug}` ||
      group.columns.some(
        (column) => column.href.split("?")[0] === `/danh-muc/${currentSlug}`,
      ));
  const accountHref = user ? "/don-hang" : "/dang-nhap";

  // Kiểm tra trang chủ để có hiệu ứng trong suốt (overlay trên hero slideshow)
  const isHomePage = pathname === "/";
  const [isAtTop, setIsAtTop] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const lastScrollY = useRef(0);
  const accumulatedScroll = useRef(0);

  // Đóng menu khi chuyển trang
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const handleScroll = () => {
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastScrollY.current;

      // Đỉnh trang
      setIsAtTop(currentY <= 20);

      // Cơ chế hide on scroll down, show on scroll up:
      if (currentY <= 20) {
        setIsVisible(true);
        accumulatedScroll.current = 0;
      } else if (delta < -4) {
        // Cuộn lên -> hiện header lại
        setIsVisible(true);
        accumulatedScroll.current = 0;
      } else if (delta > 4) {
        // Cuộn xuống -> tích luỹ khoảng cách, vượt 40px thì thụt lên
        accumulatedScroll.current += delta;
        if (accumulatedScroll.current > 40 && !open) {
          setIsVisible(false);
        }
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const isTransparent = isHomePage && isAtTop && !isHovered;

  return (
    <>
      {/* Spacer giữ chỗ để trang không bị giật layout khi header ở chế độ fixed */}
      {!isHomePage && <div className="h-[108px]" aria-hidden="true" />}

      <header
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-0 right-0 z-40 w-full transition-all duration-300 ease-in-out ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        } ${
          isTransparent
            ? "bg-transparent text-white"
            : "bg-bg/95 text-ink shadow-sm backdrop-blur-md"
        }`}
      >
        {/* Thanh thông báo chạy vòng ở trên cùng: luôn nền đen đặc, chữ trắng */}
        <AnnouncementBar />

        <Container className="flex h-[4.5rem] items-center gap-4">
          <Wordmark isTransparent={isTransparent} />

          {nav.length > 0 ? (
            <nav
              aria-label="Danh mục sản phẩm"
              className="hidden shrink-0 items-center gap-5 xl:flex"
            >
              {nav.map((group) => (
                <NavGroupItem
                  key={group.name}
                  group={group}
                  isActive={isGroupActive(group)}
                  isTransparent={isTransparent}
                />
              ))}
              {INFO_LINKS.map((link) => (
                <NavPlainItem
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  isTransparent={isTransparent}
                />
              ))}
            </nav>
          ) : null}

          <SearchForm
            isTransparent={isTransparent}
            className="mx-auto hidden min-w-0 md:flex md:max-w-2xl md:flex-1"
          />
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Link
              href={accountHref}
              aria-label={user ? `Tài khoản ${user.username}` : "Đăng nhập"}
              className={`flex size-11 items-center justify-center rounded-btn transition-colors duration-200 ${
                isTransparent
                  ? "text-white hover:bg-white/15"
                  : "text-ink hover:bg-subtle"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="size-5"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c.8-3.5 3.5-5.5 7-5.5s6.2 2 7 5.5" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={openCart}
              aria-haspopup="dialog"
              aria-expanded={cartOpen}
              aria-label={
                ready && cartCount > 0 ? `Mở giỏ hàng, ${cartCount} sản phẩm` : "Mở giỏ hàng"
              }
              className={`relative flex size-11 items-center justify-center rounded-btn transition-colors duration-200 ${
                isTransparent
                  ? "text-white hover:bg-white/15"
                  : "text-ink hover:bg-subtle"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5"
                aria-hidden="true"
              >
                <path d="M5 8h14l-1 12H6L5 8Z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
              {ready && cartCount > 0 ? (
                <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-text">
                  {cartCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? "Đóng menu" : "Mở menu"}
              onClick={() => setOpen((value) => !value)}
              className={`flex size-11 items-center justify-center rounded-btn transition-colors duration-200 xl:hidden ${
                isTransparent
                  ? "text-white hover:bg-white/15"
                  : "text-ink hover:bg-subtle"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="size-5"
                aria-hidden="true"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </Container>

        {open ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-ink/40 xl:hidden"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <nav
              aria-label="Menu di động"
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-1 overflow-y-auto bg-bg p-5 text-ink shadow-float xl:hidden"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold">Menu</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng menu"
                  className="flex size-10 items-center justify-center rounded-btn hover:bg-subtle"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    className="size-5"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <SearchForm onDone={() => setOpen(false)} />

              {nav.map((group) => (
                <div key={group.name} className="flex flex-col gap-0.5">
                  <Link
                    href={group.viewAll.href}
                    onClick={() => setOpen(false)}
                    className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-muted hover:text-accent"
                  >
                    {group.name}
                  </Link>
                  {group.columns.map((column) => (
                    <Link
                      key={column.href}
                      href={column.href}
                      className="rounded-btn px-3 py-2.5 text-sm hover:bg-subtle"
                    >
                      {column.name}
                    </Link>
                  ))}
                </div>
              ))}
              <div className="mt-2 border-t border-line pt-2">
                {INFO_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-btn px-3 py-2.5 text-sm hover:bg-subtle"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="mt-2" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openCart();
                }}
                className="rounded-btn px-3 py-2.5 text-left text-sm hover:bg-subtle"
              >
                Giỏ hàng
                {ready && cartCount > 0 ? ` (${cartCount})` : ""}
              </button>
              {DRAWER_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-btn px-3 py-2.5 text-sm hover:bg-subtle"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={accountHref}
                className="rounded-btn px-3 py-2.5 text-sm hover:bg-subtle"
              >
                {user ? user.username : "Đăng nhập"}
              </Link>
              {user ? (
                <button
                  type="button"
                  className="rounded-btn px-3 py-2.5 text-left text-sm text-danger hover:bg-subtle"
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
    </>
  );
}

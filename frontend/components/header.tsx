"use client";

import Link from "next/link";
import Image from "next/image";
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
        className={`size-10 transition-colors duration-200 ${isTransparent ? "text-white" : "text-ink"
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
        className={`text-xl font-bold transition-colors duration-200 ${isTransparent ? "text-white" : "text-ink"
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
      className={`flex items-center gap-2 rounded-btn border px-3 transition-colors duration-200 ${isTransparent
          ? "border-white/20 bg-white/10 text-white placeholder:text-white/60 focus-within:border-white/40 focus-within:bg-white/15"
          : "border-line bg-subtle text-ink focus-within:border-accent"
        } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={`size-4 shrink-0 transition-colors duration-200 ${isTransparent ? "text-white/70" : "text-muted"
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
        className={`h-11 w-full bg-transparent text-[15px] outline-none transition-colors duration-200 ${isTransparent
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
      className="group flex h-[4.5rem] items-center"
      onClick={() => (document.activeElement as HTMLElement | null)?.blur()}
    >
      <Link
        href={group.viewAll.href}
        aria-current={isActive ? "page" : undefined}
        className={`flex items-center gap-0.5 whitespace-nowrap text-base font-medium transition-colors duration-200 ${isActive
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
      <div className="pointer-events-none absolute inset-x-0 top-full z-50 pt-2 opacity-0 transition-[opacity,transform] delay-75 duration-200 ease-out group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        <Container>
          <div className="flex -translate-y-1 justify-between gap-8 rounded-card border border-line bg-bg p-8 shadow-float transition-transform duration-200 ease-out group-hover:translate-y-0 group-focus-within:translate-y-0">
          {/* Cột trái: Tên nhóm và link Xem tất cả */}
          <div className="flex w-44 shrink-0 flex-col gap-2 border-e border-line pe-6">
            <span className="text-xl font-bold tracking-tight text-ink">
              {group.name}
            </span>
            <Link
              href={group.viewAll.href}
              className="mt-1 inline-flex items-center gap-1 text-[15px] font-semibold text-accent hover:underline"
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

          {/* Cột giữa: Các chuyên mục danh mục con */}
          <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
            {group.columns.map((column) => (
              <div key={column.name} className="flex flex-col gap-1.5">
                <Link
                  href={column.href}
                  className="mb-1 text-[15px] font-bold text-ink transition-colors hover:text-accent"
                >
                  {column.name}
                </Link>
                {column.links.map((link) => (
                  <Link
                    key={`${link.label}-${link.href}`}
                    href={link.href}
                    className="min-w-0 truncate text-[14px] text-muted transition-colors duration-150 hover:text-accent"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>

          {group.recommendations?.cards.length ? (
            <section aria-label={`${group.recommendations.title} · ${group.name}`} className="w-72 shrink-0 ps-2">
              <h2 className="mb-3 text-[15px] font-bold text-ink">{group.recommendations.title}</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {group.recommendations.cards.map((card, index) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    className={`group/feat relative block overflow-hidden rounded-xl border border-line bg-subtle ${
                      index === 0 ? "col-span-2 aspect-[16/10]" : "aspect-[4/3]"
                    }`}
                  >
                    <Image
                      src={card.image}
                      alt=""
                      fill
                      sizes={index === 0 ? "280px" : "135px"}
                      unoptimized={card.image.startsWith("http:")}
                      className="object-cover transition-transform duration-300 group-hover/feat:scale-105"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-6 text-xs font-bold text-white">
                      {card.title}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
        </Container>
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
        className={`whitespace-nowrap text-base font-medium transition-colors duration-200 ${active
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
              className={`block whitespace-nowrap transition-opacity duration-300 ${i === index ? "opacity-100" : "absolute inset-0 opacity-0"
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

export function Header({ nav }: { nav: NavGroup[] }) {
  const { user, cartCount, cartOpen, ready, openCart } = useStore();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Gaming Gear": true,
    "Office Gear": true,
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

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
        className={`fixed top-0 left-0 right-0 z-40 w-full transition-all duration-300 ease-in-out ${isVisible ? "translate-y-0" : "-translate-y-full"
          } ${isTransparent
            ? "bg-transparent text-white"
            : "bg-bg/95 text-ink shadow-sm backdrop-blur-md"
          }`}
      >
        {/* Thanh thông báo chạy vòng ở trên cùng: luôn nền đen đặc, chữ trắng */}
        <AnnouncementBar />

        <div className="relative">
          <Container className="flex h-[4.5rem] items-center gap-3 lg:gap-4">
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

            {/* Thanh tìm kiếm trên Header */}
            <SearchForm
              isTransparent={isTransparent}
              className="mx-auto hidden min-w-0 md:flex md:max-w-xs md:flex-1 lg:max-w-sm xl:max-w-md 2xl:max-w-xl"
            />

            <div className="ml-auto flex items-center gap-1 md:ml-0">
            {user?.role === "admin" ? (
              <Link
                href="/admin"
                className={`rounded-btn px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  isTransparent ? "text-white hover:bg-white/15" : "text-ink hover:bg-subtle"
                }`}
              >
                Quản trị
              </Link>
            ) : null}
            <Link
              href={accountHref}
              aria-label={user ? `Tài khoản ${user.username}` : "Đăng nhập"}
              className={`flex size-11 items-center justify-center rounded-btn transition-colors duration-200 ${isTransparent
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
              className={`relative flex size-11 items-center justify-center rounded-btn transition-colors duration-200 ${isTransparent
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
              className={`flex size-11 items-center justify-center rounded-btn transition-colors duration-200 xl:hidden ${isTransparent
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
      </div>

      </header>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-ink/40 xl:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav
            aria-label="Menu di động"
            className="fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col gap-2 overflow-y-auto bg-bg p-5 text-ink shadow-float xl:hidden"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-lg font-bold">Menu</span>
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

            <div className="flex flex-col gap-1 py-1">
              {nav.map((group) => {
                const isExpanded = Boolean(expandedGroups[group.name]);
                return (
                  <div key={group.name} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.name)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center justify-between rounded-btn px-3 py-2.5 text-sm font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-subtle hover:text-accent"
                    >
                      <span>{group.name}</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`size-4 text-muted transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    {isExpanded ? (
                      <div className="flex flex-col gap-0.5 pb-2 ps-3">
                        <Link
                          href={group.viewAll.href}
                          onClick={() => setOpen(false)}
                          className="rounded-btn px-3 py-2 text-xs font-medium text-accent hover:bg-subtle"
                        >
                          {group.viewAll.label} →
                        </Link>
                        {group.columns.map((column) => (
                          <Link
                            key={column.href}
                            href={column.href}
                            onClick={() => setOpen(false)}
                            className="rounded-btn px-3 py-2 text-sm text-ink/80 hover:bg-subtle hover:text-ink"
                          >
                            {column.name}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-line pt-2">
              {INFO_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-btn px-3 py-2.5 text-sm font-medium hover:bg-subtle hover:text-accent"
                >
                  {link.label}
                </Link>
              ))}
              {user?.role === "admin" ? (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="block rounded-btn px-3 py-2.5 text-sm font-medium text-accent hover:bg-subtle"
                >
                  Trang quản trị
                </Link>
              ) : null}
            </div>
          </nav>
        </>
      ) : null}
    </>
  );
}

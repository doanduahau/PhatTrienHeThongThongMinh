"use client";

import Image from "next/image";
import { useEffect, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { resolveImage } from "@/lib/format";
import type { Pagination } from "@/lib/types";

/** Kế thừa nguyên văn khuôn form của trang đăng nhập/giỏ hàng (§4 tokens, không màu tự do). */
export const fieldClass =
  "h-11 w-full rounded-btn border border-line bg-bg px-3 text-sm";
export const labelClass = "mb-1 block text-sm font-medium";

/** Backend trả message chung ("Dữ liệu không hợp lệ!") nên phải lấy thêm từng lỗi field trong data. */
export const errorMessage = (err: unknown, fallback: string) => {
  if (!(err instanceof Error) || !err.message) return fallback;
  const details = (err as { data?: unknown }).data;
  const fields = Array.isArray(details)
    ? details
        .map((item) => (item as { message?: string })?.message)
        .filter(Boolean)
        .join(" ")
    : "";
  return fields || err.message;
};

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}

export function TextInput({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative w-full">
      <select
        className={`${fieldClass} appearance-none cursor-pointer pr-8 ${className}`}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

/** switch nhỏ cùng khuôn với "Còn hàng" ở sidebar lọc storefront. */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${
        checked ? "bg-accent" : "bg-line"
      } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block size-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

const PILL_TONES = {
  ok: "bg-accent-soft text-accent",
  neutral: "bg-subtle text-ink",
  bad: "bg-subtle text-danger",
} as const;

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof PILL_TONES;
  children: ReactNode;
}) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${PILL_TONES[tone]}`}>
      {children}
    </span>
  );
}

/** Tiêu đề khối nội dung + cụm nút phải (H1 đã nằm ở dải tiêu đề của shell). */
export function SectionHead({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Table({
  head,
  children,
  caption,
}: {
  head: string[];
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-bg">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-line bg-subtle text-left text-xs text-muted">
            {head.map((cell) => (
              <th key={cell} scope="col" className="px-4 py-3 font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="align-middle hover:bg-subtle">{children}</tr>;
}

export function Cell({
  children,
  className = "",
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-4 py-3 ${className}`}>
      {children}
    </td>
  );
}

export function Thumb({ src, alt = "" }: { src: string | null | undefined; alt?: string }) {
  const image = resolveImage(src);
  return (
    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-btn bg-subtle">
      {image ? (
        <Image src={image} alt={alt} width={48} height={48} className="size-full object-cover" />
      ) : null}
    </span>
  );
}

/** Thanh lọc + tìm kiếm: một hàng wrap, nút Tìm/Xoá cuối hàng. */
export function Toolbar({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-4 flex flex-wrap items-end gap-3 rounded-card border border-line bg-bg p-4"
    >
      {children}
    </form>
  );
}

function pageItems(page: number, totalPages: number): (number | "…")[] {
  const wanted = new Set([
    1, 2, 3,
    totalPages - 2, totalPages - 1, totalPages,
    page - 1, page, page + 1,
  ]);
  const sorted = [...wanted]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pager({
  pagination,
  onPage,
  busy = false,
}: {
  pagination: Pagination;
  onPage: (page: number) => void;
  busy?: boolean;
}) {
  const { page, totalPages } = pagination;
  if (totalPages <= 1) {
    return null;
  }
  return (
    <div className="mt-6 flex flex-wrap items-center justify-end gap-4 border-t border-line pt-4 text-sm">
      <nav aria-label="Phân trang" className="flex flex-wrap items-center gap-2">
        {page > 1 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onPage(page - 1)}
            className="rounded-btn border border-line px-3.5 py-2 text-sm font-medium hover:bg-subtle disabled:opacity-40 transition-colors"
          >
            Trang trước
          </button>
        ) : null}
        {pageItems(page, totalPages).map((item, i) =>
          item === "…" ? (
            <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              disabled={busy}
              onClick={() => onPage(item)}
              aria-current={item === page ? "page" : undefined}
              className={`flex size-10 items-center justify-center rounded-btn border text-sm font-medium tabular-nums transition-colors ${
                item === page
                  ? "border-accent bg-accent text-accent-text"
                  : "border-line hover:bg-subtle"
              }`}
            >
              {item}
            </button>
          ),
        )}
        {page < totalPages ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onPage(page + 1)}
            className="rounded-btn border border-line px-3.5 py-2 text-sm font-medium hover:bg-subtle disabled:opacity-40 transition-colors"
          >
            Trang sau
          </button>
        ) : null}
      </nav>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-card border border-line bg-bg p-5 shadow-float"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-btn px-2 py-1 text-muted hover:bg-subtle hover:text-ink"
            aria-label="Đóng hộp thoại"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  );
}

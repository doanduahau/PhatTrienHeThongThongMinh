"use client";

import { useEffect, useRef } from "react";
import { useStore } from "./store";
import { CartLineCompact } from "./cart-line-row";
import { ButtonLink } from "./ui";
import { money } from "@/lib/format";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Panel giỏ hàng trượt từ cạnh phải, mở bằng icon giỏ trên header. */
export function CartDrawer() {
  const {
    cartOpen,
    closeCart,
    lines,
    subtotal,
    cartCount,
    ready,
    cartLoading,
    stepQuantity,
    removeLine,
  } = useStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!cartOpen) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-close]")?.focus();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCart();
        return;
      }
      if (event.key !== "Tab") return;
      const items = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items || items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      restoreRef.current?.focus();
    };
  }, [cartOpen, closeCart]);

  const busy = !ready || (cartLoading && lines.length === 0);

  return (
    <>
      <div
        onClick={closeCart}
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-ink/40 transition-opacity duration-200 ${
          cartOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Giỏ hàng"
        inert={!cartOpen}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col bg-bg text-ink shadow-float transition-transform duration-300 ease-out ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            Giỏ hàng
            {cartCount > 0 ? (
              <span className="flex min-w-6 items-center justify-center rounded-full bg-accent-soft px-1.5 text-xs font-semibold text-accent">
                {cartCount}
              </span>
            ) : null}
          </h2>
          <button
            type="button"
            data-close
            onClick={closeCart}
            aria-label="Đóng giỏ hàng"
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {busy ? (
            <p className="py-10 text-center text-muted">Đang tải giỏ hàng...</p>
          ) : lines.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-10 text-muted"
                aria-hidden="true"
              >
                <path d="M5 8h14l-1 12H6L5 8Z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
              <p className="text-lg font-semibold">Chưa có sản phẩm</p>
              <ButtonLink href="/san-pham" onClick={closeCart} className="mt-2">
                Tiếp tục mua hàng
              </ButtonLink>
            </div>
          ) : (
            lines.map((line) => (
              <CartLineCompact
                key={line.productId}
                line={line}
                onStep={stepQuantity}
                onRemove={removeLine}
              />
            ))
          )}
        </div>

        {lines.length > 0 ? (
          <div className="border-t border-line px-5 py-4">
            <p className="flex items-baseline justify-between font-semibold">
              <span>Tổng cộng</span>
              <span className="text-xl tabular-nums">{money(subtotal)}</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              Giá đã bao gồm thuế. Phí ship chọn ở bước thanh toán.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <ButtonLink href="/gio-hang" variant="ghost" onClick={closeCart}>
                Xem giỏ hàng
              </ButtonLink>
              <ButtonLink href="/thanh-toan" onClick={closeCart}>
                Thanh toán
              </ButtonLink>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

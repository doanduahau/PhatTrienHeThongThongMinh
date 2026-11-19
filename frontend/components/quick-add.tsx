"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { useStore } from "./store";

/** Nút thêm nhanh vào giỏ — 44px để đủ vùng chạm, tự báo thành công trong 1.8s. */
export function QuickAdd({ product, className = "" }: { product: Product; className?: string }) {
  const { addToCart, toast } = useStore();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Danh sách sản phẩm chỉ trả `isInStock` (backend loại `stockQuantity` khỏi list),
  // chi tiết sản phẩm mới có cả hai — thiếu số lượng thì vẫn coi là còn hàng.
  const available =
    product.isInStock !== false && (product.stockQuantity == null || product.stockQuantity > 0);

  const add = async () => {
    if (busy || !available) return;
    setBusy(true);
    try {
      await addToCart(product, 1);
      setAdded(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setAdded(false), 1800);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Không thêm được vào giỏ.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={!available || busy}
      onClick={add}
      aria-label={
        available
          ? `Thêm ${product.name} vào giỏ`
          : `${product.name} — hết hàng`
      }
      title={available ? "Thêm vào giỏ" : "Hết hàng"}
      className={`flex size-11 items-center justify-center rounded-btn border border-line bg-bg/95 text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {added ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
          <path d="M5 8h14l-1 12H6L5 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      )}
    </button>
  );
}

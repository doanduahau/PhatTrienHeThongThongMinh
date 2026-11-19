"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { useStore } from "./store";
import { Button } from "./ui";

export function AddToCart({ product }: { product: Product }) {
  const { addToCart } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = product.stockQuantity > 0;

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      await addToCart(product, Math.min(Math.max(1, quantity), 99));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thêm được vào giỏ.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="quantity" className="mb-1 block text-sm font-medium">
            Số lượng
          </label>
          <input
            id="quantity"
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value) || 1)}
            className="h-12 w-24 rounded-btn border border-line px-3"
          />
        </div>
        <Button size="lg" disabled={!available || busy} onClick={add}>
          {available ? (busy ? "Đang thêm..." : "Thêm vào giỏ") : "Hết hàng"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">{error}</p>
      ) : null}
    </div>
  );
}

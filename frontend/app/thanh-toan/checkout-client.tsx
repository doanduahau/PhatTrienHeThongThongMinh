"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { ShippingMethod } from "@/lib/types";
import { useStore } from "@/components/store";
import { Button, ButtonLink, Container, EmptyState } from "@/components/ui";
import { money } from "@/lib/format";

export default function CheckoutClient() {
  const router = useRouter();
  const { user, lines, subtotal, refreshCart, toast } = useStore();
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      try {
        const all = await api.shippingMethods();
        if (cancelled) return;
        const active = all.filter((method) => method.isActive);
        setMethods(active);
        setMethodId(active[0]?.id ?? null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Không tải được phương thức vận chuyển.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const fee = methods.find((method) => method.id === methodId)?.fee ?? 0;
  const loggedIn = Boolean(user);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setBusy(true);
    try {
      const order = await api.checkout({
        shippingMethodId: data.get("shippingMethodId")?.toString() ?? "",
        shippingAddress: data.get("shippingAddress")?.toString().trim() ?? "",
        shippingPhone: data.get("shippingPhone")?.toString().trim() ?? "",
      });
      toast(`Đã đặt đơn #${order.id}.`);
      await refreshCart();
      router.push("/don-hang");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đặt hàng thất bại.");
      setBusy(false);
    }
  };

  return (
    <>
      <section className="bg-subtle py-10">
        <Container>
          <nav aria-label="Đường dẫn" className="mb-3 flex gap-2 text-sm text-muted">
            <Link href="/" className="hover:text-accent">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <Link href="/gio-hang" className="hover:text-accent">Giỏ hàng</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Thanh toán</span>
          </nav>
          <h1 className="text-3xl font-bold lg:text-4xl">Thanh toán</h1>
          <p className="mt-2 text-muted">
            Chọn cách giao hàng và xác nhận địa chỉ. Bạn thanh toán khi nhận hàng.
          </p>
        </Container>
      </section>

      <Container className="grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
        {lines.length === 0 ? (
          <EmptyState
            title="Giỏ hàng đang trống"
            text="Thêm sản phẩm vào giỏ trước khi thanh toán."
            href="/san-pham"
            cta="Xem sản phẩm"
          />
        ) : !loggedIn ? (
          <section className="rounded-card border border-line p-6">
            <h2 className="text-lg font-semibold">Đăng nhập để đặt hàng</h2>
            <p className="mt-2 text-muted">
              Giỏ đang lưu trên trình duyệt này sẽ được đồng bộ vào tài khoản sau khi bạn đăng nhập.
            </p>
            <ButtonLink href="/dang-nhap?next=/thanh-toan" className="mt-4">
              Đăng nhập
            </ButtonLink>
          </section>
        ) : (
          <form onSubmit={submit} className="space-y-5 rounded-card border border-line p-6">
            <div>
              <label htmlFor="shippingMethod" className="mb-1 block text-sm font-medium">
                Phương thức vận chuyển
              </label>
              {error && methods.length === 0 ? (
                <p role="alert" className="text-sm text-danger">{error}</p>
              ) : (
                <select
                  id="shippingMethod"
                  name="shippingMethodId"
                  required
                  value={methodId ?? ""}
                  onChange={(event) => setMethodId(event.target.value)}
                  className="h-11 w-full rounded-btn border border-line bg-bg px-3 text-sm"
                >
                  {methods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}, {money(method.fee)}
                      {method.estimatedDays ? `, ${method.estimatedDays}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label htmlFor="shippingAddress" className="mb-1 block text-sm font-medium">
                Địa chỉ giao hàng
              </label>
              <input
                id="shippingAddress"
                name="shippingAddress"
                type="text"
                required
                minLength={5}
                maxLength={255}
                defaultValue={user?.address ?? ""}
                className="h-11 w-full rounded-btn border border-line px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="shippingPhone" className="mb-1 block text-sm font-medium">
                Số điện thoại
              </label>
              <input
                id="shippingPhone"
                name="shippingPhone"
                type="tel"
                required
                pattern="[0-9+\s.\-]{8,20}"
                className="h-11 w-full rounded-btn border border-line px-3 text-sm"
              />
            </div>
            <Button type="submit" size="lg" disabled={busy || methods.length === 0}>
              {busy ? "Đang đặt hàng..." : "Đặt hàng"}
            </Button>
            {error && methods.length > 0 ? (
              <p role="alert" className="text-sm text-danger">{error}</p>
            ) : null}
          </form>
        )}

        {lines.length > 0 ? (
          <section aria-labelledby="summary-heading" className="h-fit rounded-card border border-line p-6">
            <h2 id="summary-heading" className="mb-4 text-lg font-semibold">Đơn hàng</h2>
            <ul className="mb-4 space-y-2 text-sm">
              {lines.map((line) => (
                <li key={line.productId} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    {line.name}
                    <span className="text-muted"> × {line.quantity}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{money(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <p className="flex justify-between border-t border-line py-2 text-sm">
              <span className="text-muted">Tạm tính</span>
              <span>{money(subtotal)}</span>
            </p>
            <p className="flex justify-between py-1.5 text-sm">
              <span className="text-muted">Phí vận chuyển</span>
              <span>{loggedIn ? money(fee) : "Tính sau"}</span>
            </p>
            <p className="flex justify-between border-t border-line py-3 font-semibold">
              <span>Tổng cộng</span>
              <span>{money(subtotal + (loggedIn ? fee : 0))}</span>
            </p>
            <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs text-muted">
              <li>Thanh toán khi nhận hàng</li>
              <li>Kiểm tra hàng trước khi nhận</li>
              <li>Hỗ trợ đổi trả 7 ngày</li>
            </ul>
          </section>
        ) : null}
      </Container>
    </>
  );
}

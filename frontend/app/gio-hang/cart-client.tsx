"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { Cart, ShippingMethod } from "@/lib/types";
import { money, resolveImage } from "@/lib/format";
import { useStore, type GuestLine } from "@/components/store";
import { Button, ButtonLink, Container, EmptyState } from "@/components/ui";
import { CategoryArt } from "@/components/category-art";

type Line = {
  productId: number;
  name: string;
  imageUrl: string | null;
  price: number;
  quantity: number;
  lineTotal: number;
  categorySlug: string | null;
};

const normalizeServer = (cart: Cart): Line[] =>
  cart.items.map((item) => {
    const product = item.product;
    const price = Number(item.price ?? product?.price ?? 0);
    return {
      productId: item.productId ?? product?.id ?? 0,
      name: item.name ?? product?.name ?? "",
      imageUrl: item.imageUrl ?? product?.imageUrl ?? null,
      price,
      quantity: item.quantity,
      lineTotal: Number(item.lineTotal ?? price * item.quantity),
      categorySlug: item.categorySlug ?? product?.category?.slug ?? null,
    };
  });

const normalizeGuest = (items: GuestLine[]): Line[] =>
  items.map((item) => ({
    productId: item.productId,
    name: item.name,
    imageUrl: item.imageUrl,
    price: item.price,
    quantity: item.quantity,
    lineTotal: item.price * item.quantity,
    categorySlug: item.categorySlug,
  }));

function CartLineRow({
  line,
  onStep,
  onRemove,
}: {
  line: Line;
  onStep: (productId: number, step: number) => void;
  onRemove: (productId: number) => void;
}) {
  const image = resolveImage(line.imageUrl);
  return (
    <article className="grid grid-cols-[88px_1fr_auto] items-center gap-4 border-b border-line py-4 last:border-0">
      <div className="relative flex size-22 items-center justify-center overflow-hidden rounded-card bg-subtle">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={line.name} width={88} height={88} loading="lazy" className="size-full object-cover" />
        ) : (
          <CategoryArt slug={line.categorySlug} className="size-9 text-muted" />
        )}
      </div>
      <div>
        <Link href={`/san-pham/${line.productId}`} className="font-medium hover:text-accent">
          {line.name}
        </Link>
        <p className="text-sm text-muted">{money(line.price)} mỗi cái</p>
        <div className="mt-2 flex items-center gap-4">
          <div className="flex items-center rounded-btn border border-line">
            <button
              type="button"
              aria-label="Giảm số lượng"
              onClick={() => onStep(line.productId, -1)}
              className="flex size-9 items-center justify-center hover:bg-subtle"
            >
              −
            </button>
            <output aria-live="polite" className="w-8 text-center text-sm">{line.quantity}</output>
            <button
              type="button"
              aria-label="Tăng số lượng"
              onClick={() => onStep(line.productId, 1)}
              className="flex size-9 items-center justify-center hover:bg-subtle"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => onRemove(line.productId)}
            className="text-sm text-muted hover:text-danger"
          >
            Xoá
          </button>
        </div>
      </div>
      <p className="font-semibold">{money(line.lineTotal)}</p>
    </article>
  );
}

export default function CartPage() {
  const router = useRouter();
  const { user, ready, guestItems, setGuestQuantity, removeGuest, refreshCart, toast } = useStore();
  const [serverCart, setServerCart] = useState<Cart | null>(null);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loggedIn = Boolean(user);

  const reload = useCallback(async () => {
    if (!loggedIn) {
      setLoading(false);
      return;
    }
    try {
      const [cart, shipping] = await Promise.all([api.cart(), api.shippingMethods()]);
      setServerCart(cart);
      const active = shipping.filter((method) => method.isActive);
      setMethods(active);
      setMethodId((current) => current ?? active[0]?.id ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được giỏ hàng.");
    } finally {
      setLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    if (ready) queueMicrotask(() => void reload());
  }, [ready, reload]);

  const lines = loggedIn ? normalizeServer(serverCart ?? { items: [], subtotal: 0, totalItems: 0 }) : normalizeGuest(guestItems);
  const subtotal = loggedIn
    ? Number(serverCart?.subtotal ?? 0)
    : guestItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const fee = methods.find((method) => method.id === methodId)?.fee ?? 0;
  const showCheckout = loggedIn && lines.length > 0;

  const step = async (productId: number, delta: number) => {
    if (loggedIn) {
      const line = serverCart?.items.find((item) => item.productId === productId);
      if (!line) return;
      const next = line.quantity + delta;
      try {
        if (next <= 0) await api.removeCartItem(productId);
        else await api.updateCartItem(productId, next);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Không cập nhật được giỏ.");
      }
      await reload();
      await refreshCart();
    } else {
      const line = guestItems.find((item) => item.productId === productId);
      setGuestQuantity(productId, Math.max(0, (line?.quantity ?? 1) + delta));
    }
  };

  const remove = async (productId: number) => {
    if (loggedIn) {
      try {
        await api.removeCartItem(productId);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Không xoá được sản phẩm.");
      }
      await reload();
      await refreshCart();
    } else {
      removeGuest(productId);
    }
  };

  const checkout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setCheckoutError(null);
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
      setCheckoutError(err instanceof Error ? err.message : "Đặt hàng thất bại.");
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
            <span aria-current="page">Giỏ hàng</span>
          </nav>
          <h1 className="text-3xl font-bold lg:text-4xl">Giỏ hàng</h1>
          <p className="mt-2 text-muted">
            Kiểm tra lại gear trước khi đặt hàng. Giỏ của khách sẽ được đồng bộ khi đăng nhập.
          </p>
        </Container>
      </section>

      <Container className="grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="cart-heading">
          <h2 id="cart-heading" className="mb-4 text-xl font-semibold">Giỏ của bạn</h2>
          {!ready || loading ? (
            <p className="text-muted">Đang tải giỏ hàng...</p>
          ) : error ? (
            <p role="alert" className="text-danger">{error}</p>
          ) : lines.length === 0 ? (
            <EmptyState
              title="Giỏ hàng đang trống"
              text="Thêm vài món gear phù hợp để bắt đầu. Giỏ của khách sẽ được đồng bộ khi bạn đăng nhập."
              href="/san-pham"
              cta="Xem sản phẩm"
            />
          ) : (
            lines.map((line) => (
              <CartLineRow key={line.productId} line={line} onStep={step} onRemove={remove} />
            ))
          )}
        </section>

        {lines.length > 0 ? (
          <section aria-labelledby="summary-heading" className="h-fit rounded-card border border-line p-6">
            <h2 id="summary-heading" className="mb-4 text-lg font-semibold">Thanh toán</h2>
            <p className="flex justify-between py-1.5 text-sm">
              <span className="text-muted">Tạm tính</span>
              <span>{money(subtotal)}</span>
            </p>
            {showCheckout ? (
              <p className="flex justify-between py-1.5 text-sm">
                <span className="text-muted">Phí vận chuyển</span>
                <span>{money(fee)}</span>
              </p>
            ) : null}
            <p className="flex justify-between border-t border-line py-3 font-semibold">
              <span>Tổng cộng</span>
              <span>{money(subtotal + (showCheckout ? fee : 0))}</span>
            </p>

            {showCheckout ? (
              <form onSubmit={checkout} className="mt-2 space-y-4">
                <div>
                  <label htmlFor="shippingMethod" className="mb-1 block text-sm font-medium">
                    Phương thức vận chuyển
                  </label>
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
                <Button type="submit" size="lg" disabled={busy} className="w-full">
                  {busy ? "Đang đặt hàng..." : "Đặt hàng"}
                </Button>
                {checkoutError ? (
                  <p role="alert" className="text-sm text-danger">{checkoutError}</p>
                ) : null}
              </form>
            ) : (
              <div className="mt-2 space-y-3">
                <p className="text-sm text-muted">
                  Giỏ đang lưu trên trình duyệt này.{" "}
                  <Link href="/dang-nhap?next=/gio-hang" className="text-accent hover:underline">
                    Đăng nhập
                  </Link>{" "}
                  để đặt hàng.
                </p>
                <ButtonLink href="/dang-nhap?next=/gio-hang" className="w-full">
                  Đăng nhập để đặt hàng
                </ButtonLink>
              </div>
            )}

            <ul className="mt-5 space-y-1.5 border-t border-line pt-4 text-xs text-muted">
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

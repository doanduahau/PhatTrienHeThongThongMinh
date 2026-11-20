"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Order } from "@/lib/types";
import { dateTime, money, ORDER_STATUS_LABELS, resolveImage } from "@/lib/format";
import { useStore } from "@/components/store";
import { Container, EmptyState } from "@/components/ui";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-accent-soft text-accent",
  confirmed: "bg-accent-soft text-accent",
  shipping: "bg-accent-soft text-accent",
  delivered: "bg-subtle text-ink",
  cancelled: "bg-subtle text-danger",
};

function OrderCard({ order, onCancel }: { order: Order; onCancel: (id: number) => void }) {
  const [busy, setBusy] = useState(false);
  const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
  return (
    <article className="rounded-card border border-line p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold">Đơn #{order.id}</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[order.status] ?? "bg-subtle"}`}>
          {statusLabel}
        </span>
        <span className="ml-auto text-sm text-muted">{dateTime(order.createdAt)}</span>
      </div>
      <ul className="mt-4 space-y-2">
        {order.items.map((item) => {
          const image = resolveImage(item.product?.imageUrl);
          return (
            <li key={item.id} className="flex items-center gap-3 text-sm">
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-btn bg-subtle">
                {image ? (
                  <Image src={image} alt="" width={48} height={48} className="size-full object-cover" />
                ) : null}
              </span>
              <span className="flex-1">
                {item.product?.name ?? "Sản phẩm"} × {item.quantity}
              </span>
              <span className="font-medium tabular-nums">{money(Number(item.price) * item.quantity)}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-sm">
        <span className="text-muted">{order.shippingMethod?.name ?? ""}</span>
        <span className="text-muted">{order.shippingAddress}</span>
        {order.status === "pending" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              onCancel(order.id);
            }}
            className="text-muted hover:text-danger disabled:opacity-50"
          >
            Huỷ đơn
          </button>
        ) : null}
        <span className="ml-auto font-semibold tabular-nums">Tổng {money(order.totalAmount)}</span>
      </div>
    </article>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const { user, ready, logout, toast } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.orders({ limit: 20 });
      setOrders(data.items);
      setMessage(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    queueMicrotask(() => {
      if (user) void load();
      else setLoading(false);
    });
  }, [ready, user, load]);

  const cancel = async (id: number) => {
    try {
      await api.cancelOrder(id);
      toast("Đã huỷ đơn hàng.");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Không huỷ được đơn.");
    }
  };

  return (
    <>
      <section className="bg-subtle py-10">
        <Container>
          <nav aria-label="Đường dẫn" className="mb-3 flex gap-2 text-sm text-muted">
            <Link href="/" className="hover:text-accent">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Đơn hàng</span>
          </nav>
          <h1 className="text-3xl font-bold lg:text-4xl">Đơn hàng</h1>
          <p className="mt-2 text-muted">
            Theo dõi trạng thái, xem lại món đã mua và huỷ đơn đang chờ xử lý.
          </p>
        </Container>
      </section>

      <Container className="grid gap-10 py-10 lg:grid-cols-[240px_1fr]">
        <aside aria-label="Tài khoản" className="h-fit space-y-1 rounded-card border border-line p-4">
          <div className="mb-3 flex items-center gap-3 border-b border-line pb-4">
            <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">
              {user ? user.username.slice(0, 2).toUpperCase() : "GS"}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{user?.username ?? "Khách"}</p>
              <p className="truncate text-xs text-muted">{user?.email ?? "Chưa đăng nhập"}</p>
            </div>
          </div>
          <Link href="/don-hang" aria-current="page" className="block rounded-btn bg-accent-soft px-3 py-2 text-sm font-medium text-accent">
            Đơn hàng của tôi
          </Link>
          <Link href="/gio-hang" className="block rounded-btn px-3 py-2 text-sm hover:bg-subtle">Giỏ hàng</Link>
          <Link href="/san-pham" className="block rounded-btn px-3 py-2 text-sm hover:bg-subtle">Tiếp tục mua gear</Link>
          {user ? (
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/dang-nhap");
              }}
              className="block w-full rounded-btn px-3 py-2 text-left text-sm text-danger hover:bg-subtle"
            >
              Đăng xuất
            </button>
          ) : null}
        </aside>

        <section aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="mb-4 text-xl font-semibold">Lịch sử đơn hàng</h2>
          {!ready || loading ? (
            <p className="text-muted">Đang tải...</p>
          ) : !user ? (
            <EmptyState
              title="Đăng nhập để xem đơn hàng"
              text="Đơn hàng của bạn sẽ được lưu và theo dõi trong tài khoản Gear Shop."
              href="/dang-nhap?next=/don-hang"
              cta="Đăng nhập"
            />
          ) : message ? (
            <p role="alert" className="text-danger">{message}</p>
          ) : orders.length === 0 ? (
            <EmptyState
              title="Chưa có đơn hàng nào"
              text="Khi bạn đặt gear, đơn hàng sẽ xuất hiện ở đây để theo dõi trạng thái."
              href="/san-pham"
              cta="Xem sản phẩm"
            />
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} onCancel={cancel} />
              ))}
            </div>
          )}
        </section>
      </Container>
    </>
  );
}

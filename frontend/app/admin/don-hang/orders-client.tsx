"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AdminOrder, Pagination } from "@/lib/types";
import { dateTime, money, ORDER_STATUS_LABELS } from "@/lib/format";
import { useStore } from "@/components/store";
import { Button } from "@/components/ui";
import {
  Cell,
  ErrorNote,
  Modal,
  Pager,
  Pill,
  Row,
  Select,
  Table,
  TextInput,
  Toolbar,
  errorMessage,
} from "@/components/admin/ui";

const STATUS_TONE: Record<string, "ok" | "neutral" | "bad"> = {
  pending: "ok",
  confirmed: "ok",
  shipping: "ok",
  delivered: "neutral",
  cancelled: "bad",
};

/** Cùng bảng chuyển trạng thái với ALLOWED_TRANSITIONS trong business service. */
const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  pending: [
    { value: "confirmed", label: "Xác nhận" },
    { value: "cancelled", label: "Huỷ đơn" },
  ],
  confirmed: [
    { value: "shipping", label: "Bắt đầu giao" },
    { value: "cancelled", label: "Huỷ đơn" },
  ],
  shipping: [{ value: "delivered", label: "Giao xong" }],
  delivered: [],
  cancelled: [],
};

type Filters = { q: string; status: string; from: string; to: string };

const EMPTY_FILTERS: Filters = { q: "", status: "", from: "", to: "" };

export default function AdminOrdersClient() {
  const { toast } = useStore();
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null);

  const load = useCallback(async (filters: Filters, nextPage: number) => {
    setLoading(true);
    try {
      const data = await api.admin.orders({
        search: filters.q,
        status: filters.status,
        from: filters.from,
        to: filters.to,
        page: nextPage,
        limit: 20,
      });
      setOrders(data.items);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Không tải được đơn hàng."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load(applied, page));
  }, [load, applied, page]);

  const updateFilter = (patch: Partial<Filters>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      setApplied(next);
      setPage(1);
      return next;
    });
  };

  const handleSearchChange = (q: string) => {
    setDraft((prev) => ({ ...prev, q }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setApplied((prev) => (prev.q === draft.q ? prev : { ...prev, q: draft.q }));
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [draft.q]);

  const patch = async (order: AdminOrder, run: () => Promise<unknown>, message: string) => {
    setBusyId(order.id);
    try {
      await run();
      toast(message);
      const data = await api.admin.orders({
        search: applied.q,
        status: applied.status,
        from: applied.from,
        to: applied.to,
        page,
        limit: 20,
      });
      setOrders(data.items);
      setPagination(data.pagination);
      setDetailOrder((prev) => (prev?.id === order.id ? data.items.find((o) => o.id === order.id) ?? null : prev));
    } catch (err) {
      toast(errorMessage(err, "Không cập nhật được đơn hàng."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section aria-label="Danh sách đơn hàng">
      <div className="mb-6 flex h-11 items-center justify-between gap-4 border-b border-line pb-4">
        <span className="text-base font-semibold leading-none text-ink">
          {pagination ? `${pagination.total} đơn hàng` : "Đang tải..."}
        </span>
      </div>

      <Toolbar
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div className="min-w-[220px] flex-1">
          <label htmlFor="q" className="mb-1 block text-sm font-medium">
            Tìm đơn
          </label>
          <TextInput
            id="q"
            name="q"
            value={draft.q}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Mã đơn, khách hàng hoặc số điện thoại..."
          />
        </div>
        <div className="w-40">
          <label htmlFor="status" className="mb-1 block text-sm font-medium">
            Trạng thái
          </label>
          <Select
            id="status"
            name="status"
            value={draft.status}
            onChange={(event) => updateFilter({ status: event.target.value })}
          >
            <option value="">Tất cả</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-36">
          <label htmlFor="from" className="mb-1 block text-sm font-medium">
            Từ ngày
          </label>
          <TextInput
            id="from"
            name="from"
            type="date"
            value={draft.from}
            onChange={(event) => updateFilter({ from: event.target.value })}
          />
        </div>
        <div className="w-36">
          <label htmlFor="to" className="mb-1 block text-sm font-medium">
            Đến ngày
          </label>
          <TextInput
            id="to"
            name="to"
            type="date"
            value={draft.to}
            onChange={(event) => updateFilter({ to: event.target.value })}
          />
        </div>
        {applied.q || applied.status || applied.from || applied.to ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(EMPTY_FILTERS);
              setApplied(EMPTY_FILTERS);
              setPage(1);
            }}
          >
            Xoá lọc
          </Button>
        ) : null}
      </Toolbar>

      <ErrorNote message={error} />

      <div>
        {loading ? (
          <p className="text-muted">Đang tải...</p>
        ) : orders.length === 0 ? (
          <p className="rounded-card border border-line bg-bg px-4 py-10 text-center text-muted">
            Không có đơn hàng nào khớp bộ lọc.
          </p>
        ) : (
          <Table head={["Đơn", "Khách hàng", "Sản phẩm", "Giao hàng", "Tổng", "Trạng thái", "Chi tiết"]}>
            {orders.map((order) => (
              <Row key={order.id}>
                <Cell>
                  <p className="font-medium">{order.code}</p>
                  <p className="text-xs text-muted">{dateTime(order.createdAt)}</p>
                </Cell>
                <Cell>
                  <p>{order.user?.username ?? "—"}</p>
                  <p className="text-xs text-muted">{order.user?.email}</p>
                </Cell>
                <Cell className="max-w-72">
                  <ul className="space-y-0.5">
                    {order.items.slice(0, 2).map((item) => (
                      <li key={item.id} className="truncate">
                        {item.product?.name ?? "Sản phẩm"} × {item.quantity}
                      </li>
                    ))}
                    {order.items.length > 2 ? (
                      <li className="text-xs text-muted">+{order.items.length - 2} món</li>
                    ) : null}
                  </ul>
                </Cell>
                <Cell className="max-w-64 text-xs text-muted">
                  <p className="truncate">{order.shippingAddress}</p>
                  <p>{order.shippingPhone}</p>
                  <p>{order.shippingMethod?.name}</p>
                </Cell>
                <Cell className="font-medium tabular-nums whitespace-nowrap">
                  {money(order.totalAmount)}
                </Cell>
                <Cell className="space-y-1 whitespace-nowrap">
                  <Pill tone={STATUS_TONE[order.status] ?? "neutral"}>
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </Pill>
                  <p>
                    <Pill tone={order.paymentStatus === "paid" ? "ok" : "bad"}>
                      {order.paymentStatus === "paid" ? "Đã thu" : "Chưa thu"}
                    </Pill>
                  </p>
                </Cell>
                <Cell className="whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setDetailOrder(order)}
                    className="rounded-btn border border-line px-3 py-1.5 text-xs font-medium hover:bg-subtle transition-colors"
                  >
                    Chi tiết
                  </button>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </div>

      {detailOrder ? (
        <Modal
          title={`Chi tiết đơn ${detailOrder.code}`}
          onClose={() => setDetailOrder(null)}
        >
          <div className="space-y-6 text-sm">
            {/* Header info */}
            <div className="grid gap-3 rounded-card border border-line bg-subtle/50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted">Khách hàng</p>
                <p className="font-medium text-ink">{detailOrder.user?.username ?? "Khách lẻ"}</p>
                <p className="text-xs text-muted">{detailOrder.user?.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Ngày đặt</p>
                <p className="font-medium text-ink">{dateTime(detailOrder.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Địa chỉ nhận hàng</p>
                <p className="font-medium text-ink">{detailOrder.shippingAddress}</p>
                <p className="text-xs text-muted">SĐT: {detailOrder.shippingPhone}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Phương thức vận chuyển</p>
                <p className="font-medium text-ink">{detailOrder.shippingMethod?.name ?? "Giao hàng tiêu chuẩn"}</p>
                <p className="text-xs text-muted">
                  Phí ship: {money(detailOrder.shippingMethod?.fee ?? 0)}
                </p>
              </div>
            </div>

            {/* Trạng thái hiện tại */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-4">
              <div className="flex items-center gap-3">
                <span className="text-muted">Trạng thái đơn:</span>
                <Pill tone={STATUS_TONE[detailOrder.status] ?? "neutral"}>
                  {ORDER_STATUS_LABELS[detailOrder.status] ?? detailOrder.status}
                </Pill>
                <span className="text-muted">Thanh toán:</span>
                <Pill tone={detailOrder.paymentStatus === "paid" ? "ok" : "bad"}>
                  {detailOrder.paymentStatus === "paid" ? "Đã thu" : "Chưa thu"}
                </Pill>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted">Tổng thanh toán: </span>
                <span className="text-lg font-bold text-accent tabular-nums">
                  {money(detailOrder.totalAmount)}
                </span>
              </div>
            </div>

            {/* Danh sách sản phẩm */}
            <div>
              <h3 className="mb-2 font-semibold text-ink">Sản phẩm trong đơn ({detailOrder.items.length})</h3>
              <div className="divide-y divide-line rounded-card border border-line bg-bg">
                {detailOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{item.product?.name ?? "Sản phẩm"}</p>
                      <p className="text-xs text-muted">
                        Đơn giá: {money(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums text-ink">
                      {money(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Các nút thao tác chuyển trạng thái */}
            <div className="border-t border-line pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Thao tác đơn hàng
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {NEXT_STATUS[detailOrder.status]?.map((next) => (
                  <button
                    key={next.value}
                    type="button"
                    disabled={busyId === detailOrder.id}
                    onClick={() =>
                      patch(
                        detailOrder,
                        () => api.admin.setOrderStatus(detailOrder.id, next.value),
                        next.value === "cancelled"
                          ? `Đã huỷ ${detailOrder.code} và hoàn kho.`
                          : `Đã chuyển ${detailOrder.code} sang "${next.label}".`,
                      )
                    }
                    className={`rounded-btn border border-line px-3.5 py-2 text-sm font-medium hover:bg-subtle disabled:opacity-50 transition-colors ${
                      next.value === "cancelled" ? "border-danger/30 text-danger hover:bg-danger/10" : "bg-bg text-ink"
                    }`}
                  >
                    Chuyển sang: {next.label}
                  </button>
                ))}

                {detailOrder.paymentStatus !== "paid" && detailOrder.status !== "cancelled" ? (
                  <button
                    type="button"
                    disabled={busyId === detailOrder.id}
                    onClick={() =>
                      patch(
                        detailOrder,
                        () => api.admin.setOrderPayment(detailOrder.id, "paid"),
                        `Đã xác nhận thu tiền ${detailOrder.code}.`,
                      )
                    }
                    className="rounded-btn bg-accent px-3.5 py-2 text-sm font-medium text-accent-text hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    Xác nhận đã thu tiền
                  </button>
                ) : null}

                {(!NEXT_STATUS[detailOrder.status]?.length && (detailOrder.paymentStatus === "paid" || detailOrder.status === "cancelled")) ? (
                  <span className="text-xs text-muted">Đơn hàng đã hoàn tất hoặc đã huỷ, không còn thao tác khả dụng.</span>
                ) : null}
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {pagination ? (
        <Pager pagination={pagination} busy={loading} onPage={(next) => setPage(next)} />
      ) : null}
    </section>
  );
}

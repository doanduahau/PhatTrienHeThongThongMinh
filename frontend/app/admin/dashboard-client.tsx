"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { LowStockItem, RevenuePoint, StatsOverview, TopProduct } from "@/lib/types";
import { money } from "@/lib/format";
import {
  Cell,
  ErrorNote,
  Row,
  Select,
  Table,
  errorMessage,
} from "@/components/admin/ui";

const CARDS = (overview: StatsOverview) => [
  { label: "Doanh thu (đơn đã giao)", value: money(overview.revenue) },
  { label: "Đơn đã giao", value: String(overview.deliveredOrders) },
  { label: "Chờ xác nhận", value: String(overview.ordersByStatus.pending ?? 0) },
  { label: "Đang giao", value: String(overview.ordersByStatus.shipping ?? 0) },
  { label: "Chưa thu tiền", value: String(overview.awaitingPayment) },
  { label: "Khách hàng", value: String(overview.totalUsers) },
  { label: "Sản phẩm", value: String(overview.totalProducts) },
  { label: "Tổng nhận xét", value: String(overview.totalReviews ?? 0) },
];

export default function AdminDashboardClient() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [groupBy, setGroupBy] = useState("month");
  const [top, setTop] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        try {
          const [nextOverview, nextTop, nextLow] = await Promise.all([
            api.admin.stats.overview(),
            api.admin.stats.topProducts(5),
            api.admin.stats.lowStock(5, 8),
          ]);
          setOverview(nextOverview);
          setTop(nextTop.items);
          setLowStock(nextLow.items);
          setError(null);
        } catch (err) {
          setError(errorMessage(err, "Không tải được số liệu."));
        }
      })();
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        try {
          const data = await api.admin.stats.revenue({ groupBy });
          setRevenue(data.items.slice(groupBy === "month" ? -6 : -14));
        } catch (err) {
          setError(errorMessage(err, "Không tải được doanh thu."));
        }
      })();
    });
  }, [groupBy]);

  if (error) return <ErrorNote message={error} />;
  if (!overview) return <p className="text-muted">Đang tải...</p>;

  const maxRevenue = Math.max(...revenue.map((point) => point.revenue), 1);

  return (
    <div className="space-y-8">
      <section aria-label="Chỉ số tổng quan" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CARDS(overview).map((card) => (
          <div key={card.label} className="rounded-card border border-line bg-bg p-4">
            <p className="text-xs text-muted">{card.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{card.value}</p>
          </div>
        ))}
      </section>

      <section aria-label="Doanh thu theo kỳ" className="rounded-card border border-line bg-bg p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Doanh thu đơn đã giao</h2>
            <p className="text-xs text-muted mt-0.5">Biểu đồ đối soát doanh thu theo các mốc thời gian</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted">Theo</span>
            <div className="w-28">
              <Select
                id="groupBy"
                name="groupBy"
                value={groupBy}
                onChange={(event) => setGroupBy(event.target.value)}
              >
                <option value="month">Tháng</option>
                <option value="day">Ngày</option>
              </Select>
            </div>
          </div>
        </div>
        {revenue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted">
            <p className="text-sm font-medium text-ink">Chưa có dữ liệu doanh thu</p>
            <p className="mt-1 text-xs">Doanh thu sẽ được cập nhật tự động khi các đơn hàng chuyển sang trạng thái Đã giao.</p>
          </div>
        ) : (
          <ul className="space-y-3 pt-2">
            {revenue.map((point) => (
              <li key={point.period} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-muted">{point.periodLabel}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-subtle">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${Math.max((point.revenue / maxRevenue) * 100, 2)}%` }}
                  />
                </span>
                <span className="w-32 shrink-0 text-right font-medium tabular-nums">
                  {money(point.revenue)}
                </span>
                <span className="w-16 shrink-0 text-right text-muted tabular-nums">
                  {point.orderCount} đơn
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8">
        <section aria-label="Sản phẩm bán chạy">
          <h2 className="mb-4 text-xl font-semibold">Bán chạy</h2>
          {top.length === 0 ? (
            <p className="text-muted">Chưa có đơn đã giao.</p>
          ) : (
            <Table head={["Sản phẩm", "Đã bán", "Doanh thu"]}>
              {top.map((product, index) => (
                <Row key={product.id}>
                  <Cell className="max-w-64 truncate">
                    {index + 1}. {product.name}
                  </Cell>
                  <Cell className="tabular-nums">{product.soldQuantity}</Cell>
                  <Cell className="tabular-nums">{money(product.revenue)}</Cell>
                </Row>
              ))}
            </Table>
          )}
        </section>

        <section aria-label="Tồn kho thấp">
          <h2 className="mb-4 text-xl font-semibold">Sắp hết hàng</h2>
          {lowStock.length === 0 ? (
            <p className="text-muted">Không có sản phẩm tồn kho dưới 5.</p>
          ) : (
            <Table head={["Sản phẩm", "Thương hiệu", "Tồn", "Giá"]}>
              {lowStock.map((product) => (
                <Row key={product.id}>
                  <Cell className="max-w-64 truncate">{product.name}</Cell>
                  <Cell>{product.brand?.name ?? "—"}</Cell>
                  <Cell className="tabular-nums">{product.stockQuantity}</Cell>
                  <Cell className="tabular-nums">{money(product.price)}</Cell>
                </Row>
              ))}
            </Table>
          )}
        </section>
      </div>
    </div>
  );
}

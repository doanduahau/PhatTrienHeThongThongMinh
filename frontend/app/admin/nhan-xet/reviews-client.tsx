"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AdminReview, Pagination } from "@/lib/types";
import { dateTime } from "@/lib/format";
import { useStore } from "@/components/store";
import { Button } from "@/components/ui";
import {
  Cell,
  ErrorNote,
  Modal,
  Note,
  Pager,
  Pill,
  Row,
  Table,
  TextInput,
  Thumb,
  Toolbar,
  errorMessage,
} from "@/components/admin/ui";

type Filters = { q: string; from: string; to: string };

const EMPTY_FILTERS: Filters = { q: "", from: "", to: "" };

export default function AdminReviewsClient() {
  const { toast } = useStore();
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<AdminReview | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (filters: Filters, nextPage: number) => {
    setLoading(true);
    try {
      const data = await api.admin.reviews({
        search: filters.q,
        from: filters.from,
        to: filters.to,
        page: nextPage,
        limit: 20,
      });
      setReviews(data.items);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Không tải được nhận xét."));
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

  const submitDelete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target) return;
    setDeleting(true);
    try {
      await api.admin.deleteReview(target.product.id, target.id);
      toast(`Đã xoá nhận xét ${target.id}.`);
      setTarget(null);
      await load(applied, page);
    } catch (err) {
      toast(errorMessage(err, "Xoá nhận xét thất bại."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section aria-label="Danh sách nhận xét">
      <div className="mb-6 flex h-11 items-center justify-between gap-4 border-b border-line pb-4">
        <span className="text-base font-semibold leading-none text-ink">
          {pagination ? `${pagination.total} nhận xét` : "Đang tải..."}
        </span>
      </div>

      <Toolbar
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div className="min-w-[220px] flex-1">
          <label htmlFor="q" className="mb-1 block text-sm font-medium">
            Tìm nhận xét
          </label>
          <TextInput
            id="q"
            name="q"
            value={draft.q}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Nội dung, khách hàng hoặc sản phẩm..."
          />
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
        {applied.q || applied.from || applied.to ? (
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
        ) : reviews.length === 0 ? (
          <p className="rounded-card border border-line bg-bg px-4 py-10 text-center text-muted">
            Không có nhận xét nào khớp bộ lọc.
          </p>
        ) : (
          <Table head={["Nhận xét", "Khách", "Sản phẩm", "Điểm", "Ngày", "Thao tác"]}>
            {reviews.map((review) => (
              <Row key={review.id}>
                <Cell className="max-w-96">
                  <p className="truncate">{review.content}</p>
                  <p className="text-xs text-muted">{review.id}</p>
                </Cell>
                <Cell className="whitespace-nowrap">{review.user.username}</Cell>
                <Cell className="max-w-72">
                  <div className="flex items-center gap-3">
                    <Thumb src={review.product.imageUrl} alt={review.product.name} />
                    <div className="min-w-0">
                      <Link
                        href={`/san-pham/${review.product.id}`}
                        target="_blank"
                        className="block truncate text-accent hover:underline"
                      >
                        {review.product.name}
                      </Link>
                      {review.product.isActive ? null : (
                        <p className="mt-1">
                          <Pill tone="bad">Ngừng bán</Pill>
                        </p>
                      )}
                    </div>
                  </div>
                </Cell>
                <Cell className="tabular-nums whitespace-nowrap">
                  {review.score?.toFixed(1) ?? "—"}
                </Cell>
                <Cell className="whitespace-nowrap text-xs text-muted">
                  {dateTime(review.createdAt)}
                </Cell>
                <Cell className="whitespace-nowrap">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setTarget(review)}
                    className="rounded-btn border border-line px-2.5 py-1 text-xs text-danger hover:bg-subtle disabled:opacity-50"
                  >
                    Xoá
                  </button>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </div>

      {pagination ? (
        <Pager pagination={pagination} busy={loading} onPage={(next) => setPage(next)} />
      ) : null}

      {target ? (
        <Modal title={`Xoá nhận xét ${target.id}`} onClose={() => setTarget(null)}>
          <form onSubmit={submitDelete} className="space-y-3">
            <Note>
              “{target.content}” — của {target.user.username} cho {target.product.name}.
            </Note>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setTarget(null)}>
                Huỷ
              </Button>
              <Button type="submit" size="sm" variant="dark" disabled={deleting}>
                {deleting ? "Đang xoá..." : "Xoá"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { AdminCustomer, Pagination } from "@/lib/types";
import { dateTime } from "@/lib/format";
import { useStore } from "@/components/store";
import { Button } from "@/components/ui";
import {
  Cell,
  ErrorNote,
  Field,
  Modal,
  Note,
  Pager,
  Pill,
  Row,
  Select,
  Table,
  TextInput,
  Toolbar,
  errorMessage,
} from "@/components/admin/ui";

const ROLE_LABELS: Record<string, string> = {
  customer: "Khách hàng",
  admin: "Admin",
};

type Filters = { q: string; role: string; locked: string };

const EMPTY_FILTERS: Filters = { q: "", role: "", locked: "" };

const EMPTY_FORM = {
  username: "",
  email: "",
  password: "",
  address: "",
  role: "customer",
};

export default function AdminCustomersClient() {
  const { toast, user } = useStore();
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<AdminCustomer | null>(null);
  const [pwdValue, setPwdValue] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [delTarget, setDelTarget] = useState<AdminCustomer | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const load = useCallback(async (filters: Filters, nextPage: number) => {
    setLoading(true);
    try {
      const data = await api.admin.customers({
        search: filters.q,
        role: filters.role,
        isLocked: filters.locked,
        page: nextPage,
        limit: 20,
      });
      setCustomers(data.items);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Không tải được khách hàng."));
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

  const run = async (
    customer: AdminCustomer,
    action: () => Promise<unknown>,
    message: string,
    fallback: string,
  ) => {
    setBusyId(customer.id);
    try {
      await action();
      toast(message);
      await load(applied, page);
    } catch (err) {
      toast(errorMessage(err, fallback));
    } finally {
      setBusyId(null);
    }
  };

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      await api.admin.createCustomer({
        username: form.username,
        email: form.email,
        password: form.password,
        address: form.address || undefined,
        role: form.role,
      });
      toast(`Đã tạo tài khoản ${form.username}.`);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      await load(applied, page);
    } catch (err) {
      toast(errorMessage(err, "Tạo khách hàng thất bại."));
    } finally {
      setCreating(false);
    }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pwdTarget) return;
    setPwdBusy(true);
    try {
      await api.admin.resetCustomerPassword(pwdTarget.id, pwdValue);
      toast(`Đã đặt lại mật khẩu của ${pwdTarget.username}.`);
      setPwdTarget(null);
      setPwdValue("");
      await load(applied, page);
    } catch (err) {
      toast(errorMessage(err, "Đặt lại mật khẩu thất bại."));
    } finally {
      setPwdBusy(false);
    }
  };

  const submitDelete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!delTarget) return;
    setDelBusy(true);
    try {
      await api.admin.deleteCustomer(delTarget.id);
      toast(`Đã xoá tài khoản ${delTarget.username}.`);
      setDelTarget(null);
      await load(applied, page);
    } catch (err) {
      toast(errorMessage(err, "Xoá khách hàng thất bại."));
    } finally {
      setDelBusy(false);
    }
  };

  return (
    <section aria-label="Danh sách khách hàng">
      <div className="mb-6 flex h-11 items-center justify-between gap-4 border-b border-line pb-4">
        <span className="text-base font-semibold leading-none text-ink">
          {pagination ? `${pagination.total} khách hàng` : "Đang tải..."}
        </span>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setForm(EMPTY_FORM);
            setCreateOpen(true);
          }}
        >
          Thêm khách hàng
        </Button>
      </div>

      <Toolbar
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div className="min-w-[220px] flex-1">
          <label htmlFor="q" className="mb-1 block text-sm font-medium">
            Tìm khách hàng
          </label>
          <TextInput
            id="q"
            name="q"
            value={draft.q}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Tên đăng nhập hoặc email..."
          />
        </div>
        <div className="w-40">
          <label htmlFor="role" className="mb-1 block text-sm font-medium">
            Vai trò
          </label>
          <Select
            id="role"
            name="role"
            value={draft.role}
            onChange={(event) => updateFilter({ role: event.target.value })}
          >
            <option value="">Tất cả</option>
            <option value="customer">Khách hàng</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        <div className="w-40">
          <label htmlFor="locked" className="mb-1 block text-sm font-medium">
            Khoá
          </label>
          <Select
            id="locked"
            name="locked"
            value={draft.locked}
            onChange={(event) => updateFilter({ locked: event.target.value })}
          >
            <option value="">Tất cả</option>
            <option value="true">Đang khoá</option>
            <option value="false">Đang mở</option>
          </Select>
        </div>
        {applied.q || applied.role || applied.locked ? (
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
        ) : customers.length === 0 ? (
          <p className="rounded-card border border-line bg-bg px-4 py-10 text-center text-muted">
            Không có khách hàng nào khớp bộ lọc.
          </p>
        ) : (
          <Table head={["Khách hàng", "Vai trò", "Trạng thái", "Đơn", "Tham gia", "Thao tác"]}>
            {customers.map((customer) => {
              const self = customer.id === user?.id;
              return (
                <Row key={customer.id}>
                  <Cell className="max-w-64">
                    <p className="truncate font-medium">{customer.username}</p>
                    <p className="truncate text-xs text-muted">{customer.email}</p>
                  </Cell>
                  <Cell className="whitespace-nowrap">
                    {ROLE_LABELS[customer.role] ?? customer.role}
                  </Cell>
                  <Cell className="whitespace-nowrap">
                    <Pill tone={customer.isLocked ? "bad" : "neutral"}>
                      {customer.isLocked ? "Đã khoá" : "Đang hoạt động"}
                    </Pill>
                  </Cell>
                  <Cell className="tabular-nums">{customer._count?.orders ?? 0}</Cell>
                  <Cell className="whitespace-nowrap text-xs text-muted">
                    {dateTime(customer.createdAt)}
                  </Cell>
                  <Cell className="space-y-2 whitespace-nowrap">
                    {self ? (
                      <Note>Bạn — không thao tác được trên chính mình.</Note>
                    ) : (
                      <Select
                        aria-label={`Vai trò của ${customer.username}`}
                        className="h-9 w-36 text-xs"
                        value={customer.role}
                        disabled={busyId === customer.id}
                        onChange={(event) =>
                          void run(
                            customer,
                            () => api.admin.setCustomerRole(customer.id, event.target.value),
                            `Đã đổi ${customer.username} sang “${ROLE_LABELS[event.target.value] ?? event.target.value}”.`,
                            "Đổi vai trò thất bại.",
                          )
                        }
                      >
                        <option value="customer">Khách hàng</option>
                        <option value="admin">Admin</option>
                      </Select>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={busyId === customer.id}
                        onClick={() => {
                          setPwdValue("");
                          setPwdTarget(customer);
                        }}
                        className="rounded-btn border border-line px-2.5 py-1 text-xs hover:bg-subtle disabled:opacity-50"
                      >
                        Đặt lại mật khẩu
                      </button>
                      {self ? null : (
                        <>
                          <button
                            type="button"
                            disabled={busyId === customer.id}
                            onClick={() =>
                              void run(
                                customer,
                                () =>
                                  api.admin.setCustomerLock(customer.id, !customer.isLocked),
                                customer.isLocked
                                  ? `Đã mở khoá ${customer.username}.`
                                  : `Đã khoá ${customer.username}.`,
                                "Cập nhật khoá thất bại.",
                              )
                            }
                            className={`rounded-btn border border-line px-2.5 py-1 text-xs hover:bg-subtle disabled:opacity-50 ${
                              customer.isLocked ? "" : "text-danger"
                            }`}
                          >
                            {customer.isLocked ? "Mở khoá" : "Khoá"}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === customer.id}
                            onClick={() => setDelTarget(customer)}
                            className="rounded-btn border border-line px-2.5 py-1 text-xs text-danger hover:bg-subtle disabled:opacity-50"
                          >
                            Xoá
                          </button>
                        </>
                      )}
                    </div>
                  </Cell>
                </Row>
              );
            })}
          </Table>
        )}
      </div>

      {pagination ? (
        <Pager pagination={pagination} busy={loading} onPage={(next) => setPage(next)} />
      ) : null}

      {createOpen ? (
        <Modal title="Thêm khách hàng" onClose={() => setCreateOpen(false)}>
          <form onSubmit={submitCreate} className="space-y-3">
            <Field label="Tên đăng nhập">
              <TextInput
                name="username"
                value={form.username}
                required
                minLength={3}
                maxLength={50}
                pattern="[A-Za-z0-9_]+"
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
            </Field>
            <Field label="Email">
              <TextInput
                type="email"
                name="email"
                value={form.email}
                required
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
            <Field label="Mật khẩu">
              <TextInput
                type="password"
                name="password"
                value={form.password}
                required
                minLength={6}
                maxLength={72}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </Field>
            <Field label="Địa chỉ">
              <TextInput
                name="address"
                value={form.address}
                maxLength={255}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </Field>
            <Field label="Vai trò">
              <Select
                name="newRole"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
              >
                <option value="customer">Khách hàng</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>
            <Note>Username chỉ gồm chữ, số, gạch dưới. Trùng tên hoặc email sẽ bị báo lỗi.</Note>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setCreateOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" size="sm" disabled={creating}>
                {creating ? "Đang tạo..." : "Tạo"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {pwdTarget ? (
        <Modal
          title={`Đặt lại mật khẩu — ${pwdTarget.username}`}
          onClose={() => setPwdTarget(null)}
        >
          <form onSubmit={submitPassword} className="space-y-3">
            <Field label="Mật khẩu mới">
              <TextInput
                type="password"
                name="newPassword"
                value={pwdValue}
                required
                minLength={6}
                maxLength={72}
                onChange={(event) => setPwdValue(event.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setPwdTarget(null)}>
                Huỷ
              </Button>
              <Button type="submit" size="sm" disabled={pwdBusy}>
                {pwdBusy ? "Đang lưu..." : "Đặt lại"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {delTarget ? (
        <Modal title={`Xoá ${delTarget.username}`} onClose={() => setDelTarget(null)}>
          <form onSubmit={submitDelete} className="space-y-3">
            <Note>
              Tài khoản có đơn hàng sẽ bị backend từ chối xoá. Hành động này không hoàn lại.
            </Note>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setDelTarget(null)}>
                Huỷ
              </Button>
              <Button type="submit" size="sm" variant="dark" disabled={delBusy}>
                {delBusy ? "Đang xoá..." : "Xoá"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}

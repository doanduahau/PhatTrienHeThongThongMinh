"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { ShippingMethod } from "@/lib/types";
import { money } from "@/lib/format";
import { useStore } from "@/components/store";
import { Button } from "@/components/ui";
import {
  Cell,
  ErrorNote,
  Field,
  Modal,
  Row,
  Switch,
  Table,
  TextInput,
  Toolbar,
  errorMessage,
} from "@/components/admin/ui";

type FormState = { name: string; fee: string; estimatedDays: string; isActive: boolean };

const EMPTY_FORM: FormState = { name: "", fee: "", estimatedDays: "", isActive: true };

export default function AdminShippingClient() {
  const { toast } = useStore();
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<ShippingMethod | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMethods(await api.admin.shipping());
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Không tải được phương thức vận chuyển."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (method: ShippingMethod) => {
    setEditingId(method.id);
    setForm({
      name: method.name,
      fee: String(method.fee),
      estimatedDays: method.estimatedDays ?? "",
      isActive: method.isActive,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    const fee = Number(form.fee);
    const estimatedDays = form.estimatedDays.trim();
    if (!name) {
      setFormError("Tên phương thức không được để trống.");
      return;
    }
    if (!form.fee.trim() || !Number.isFinite(fee) || fee < 0) {
      setFormError("Phí vận chuyển phải là số và không được âm.");
      return;
    }
    const payload = {
      name,
      fee,
      isActive: form.isActive,
      ...(estimatedDays ? { estimatedDays } : {}),
    };
    setBusy(true);
    try {
      if (editingId === null) {
        await api.admin.createShipping(payload);
        toast(`Đã thêm ${name}.`);
      } else {
        await api.admin.updateShipping(editingId, payload);
        toast(`Đã cập nhật ${name}.`);
      }
      closeForm();
      await load();
    } catch (err) {
      setFormError(
        errorMessage(
          err,
          editingId === null
            ? "Không thêm được phương thức vận chuyển."
            : "Không cập nhật được phương thức vận chuyển.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (method: ShippingMethod, next: boolean) => {
    setBusyId(method.id);
    try {
      await api.admin.updateShipping(method.id, { isActive: next });
      toast(next ? `Đã bật ${method.name}.` : `Đã tắt ${method.name}.`);
      await load();
    } catch (err) {
      toast(errorMessage(err, "Không cập nhật được trạng thái."));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await api.admin.deleteShipping(removing.id);
      toast(`Đã xoá ${removing.name}.`);
      setRemoving(null);
      await load();
    } catch (err) {
      toast(errorMessage(err, "Không xoá được phương thức vận chuyển."));
    } finally {
      setBusy(false);
    }
  };

  const rowBusy = busy || busyId !== null;

  return (
    <section aria-label="Phương thức vận chuyển">
      <div className="mb-6 flex h-11 items-center justify-between gap-4 border-b border-line pb-4">
        <span className="text-base font-semibold leading-none text-ink">
          {methods.length} phương thức
        </span>
        <Button type="button" size="sm" onClick={openCreate}>
          Thêm phương thức
        </Button>
      </div>

      <ErrorNote message={error} />

      <div>
        {loading ? (
          <p className="text-muted">Đang tải...</p>
        ) : methods.length === 0 ? (
          <p className="rounded-card border border-line bg-bg px-4 py-10 text-center text-muted">
            Chưa có phương thức vận chuyển nào.
          </p>
        ) : (
          <Table head={["Mã", "Tên", "Phí", "Dự kiến", "Hoạt động", "Thao tác"]}>
            {methods.map((method) => (
              <Row key={method.id}>
                <Cell className="whitespace-nowrap font-medium tabular-nums">{method.id}</Cell>
                <Cell>{method.name}</Cell>
                <Cell className="text-right tabular-nums whitespace-nowrap">
                  {money(method.fee)}
                </Cell>
                <Cell className="text-muted whitespace-nowrap">{method.estimatedDays ?? "—"}</Cell>
                <Cell>
                  <Switch
                    checked={method.isActive}
                    disabled={rowBusy}
                    label={`${method.name}: ${method.isActive ? "đang bật" : "đang tắt"}`}
                    onChange={(next) => void toggleActive(method, next)}
                  />
                </Cell>
                <Cell className="whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() => openEdit(method)}
                      className="rounded-btn border border-line px-2.5 py-1 text-xs hover:bg-subtle disabled:opacity-50"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() => setRemoving(method)}
                      className="rounded-btn border border-line px-2.5 py-1 text-xs text-danger hover:bg-subtle disabled:opacity-50"
                    >
                      Xoá
                    </button>
                  </div>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </div>

      {formOpen ? (
        <Modal
          title={editingId === null ? "Thêm phương thức" : "Sửa phương thức"}
          onClose={closeForm}
        >
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Tên phương thức">
              <TextInput
                name="name"
                value={form.name}
                required
                maxLength={100}
                disabled={busy}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Phí (₫)">
              <TextInput
                name="fee"
                type="number"
                min={0}
                step={1000}
                value={form.fee}
                disabled={busy}
                className="text-right tabular-nums"
                onChange={(event) => setForm({ ...form, fee: event.target.value })}
              />
            </Field>
            <Field label="Thời gian dự kiến">
              <TextInput
                name="estimatedDays"
                value={form.estimatedDays}
                maxLength={50}
                disabled={busy}
                placeholder="3-5 ngày"
                onChange={(event) => setForm({ ...form, estimatedDays: event.target.value })}
              />
            </Field>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                disabled={busy}
                label="Hoạt động"
                onChange={(next) => setForm({ ...form, isActive: next })}
              />
              <span className="text-sm">Hoạt động</span>
            </div>
            <ErrorNote message={formError} />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={closeForm}>
                Huỷ
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {editingId === null ? "Thêm" : "Lưu"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {removing ? (
        <Modal title="Xoá phương thức" onClose={() => setRemoving(null)}>
          <p>
            Xoá <span className="font-medium">{removing.name}</span> ({removing.id})?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Huỷ
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void confirmDelete()}>
              Xoá
            </Button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

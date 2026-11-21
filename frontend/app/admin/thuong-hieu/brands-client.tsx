"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { Brand } from "@/lib/types";
import { useStore } from "@/components/store";
import { Button } from "@/components/ui";
import {
  Cell,
  ErrorNote,
  Field,
  Modal,
  Row,
  Table,
  TextInput,
  Toolbar,
  errorMessage,
} from "@/components/admin/ui";

export default function AdminBrandsClient() {
  const { toast } = useStore();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Brand | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBrands(await api.admin.brands());
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Không tải được thương hiệu."));
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
    setName("");
    setFormError(null);
  };

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setName(brand.name);
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Tên thương hiệu không được để trống.");
      return;
    }
    setBusy(true);
    try {
      if (editingId === null) {
        await api.admin.createBrand(trimmed);
        toast(`Đã thêm ${trimmed}.`);
      } else {
        await api.admin.updateBrand(editingId, trimmed);
        toast(`Đã cập nhật ${trimmed}.`);
      }
      closeForm();
      await load();
    } catch (err) {
      setFormError(
        errorMessage(
          err,
          editingId === null ? "Không thêm được thương hiệu." : "Không cập nhật được thương hiệu.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await api.admin.deleteBrand(removing.id);
      toast(`Đã xoá ${removing.name}.`);
      setRemoving(null);
      await load();
    } catch (err) {
      toast(errorMessage(err, "Không xoá được thương hiệu."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Thương hiệu">
      <div className="mb-6 flex h-11 items-center justify-between gap-4 border-b border-line pb-4">
        <span className="text-base font-semibold leading-none text-ink">
          {brands.length} thương hiệu
        </span>
        <Button type="button" size="sm" onClick={openCreate}>
          Thêm thương hiệu
        </Button>
      </div>

      <ErrorNote message={error} />

      <div>
        {loading ? (
          <p className="text-muted">Đang tải...</p>
        ) : brands.length === 0 ? (
          <p className="rounded-card border border-line bg-bg px-4 py-10 text-center text-muted">
            Chưa có thương hiệu nào.
          </p>
        ) : (
          <Table head={["Thương hiệu", "Thao tác"]}>
            {brands.map((brand) => (
              <Row key={brand.id}>
                <Cell className="font-medium">{brand.name}</Cell>
                <Cell className="whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openEdit(brand)}
                      className="rounded-btn border border-line px-2.5 py-1 text-xs hover:bg-subtle disabled:opacity-50"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRemoving(brand)}
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
          title={editingId === null ? "Thêm thương hiệu" : "Sửa thương hiệu"}
          onClose={closeForm}
        >
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Tên thương hiệu">
              <TextInput
                name="name"
                value={name}
                required
                maxLength={100}
                disabled={busy}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
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
        <Modal title="Xoá thương hiệu" onClose={() => setRemoving(null)}>
          <p>
            Xoá <span className="font-medium">{removing.name}</span>?
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

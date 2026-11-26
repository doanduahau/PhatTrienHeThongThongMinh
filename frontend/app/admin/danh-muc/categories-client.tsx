"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";
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

type FormState = { name: string; slug: string };

const EMPTY_FORM: FormState = { name: "", slug: "" };

/// Regex của backend: tối thiểu 2 ký tự, chỉ chữ thường, số và dấu gạch ngang.
const SLUG_PATTERN = /^[a-z0-9-]+$/;

export default function AdminCategoriesClient() {
  const { toast } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await api.admin.categories());
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Không tải được danh mục."));
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

  const openEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({ name: category.name, slug: category.slug });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    const slug = form.slug.trim();
    if (!name) {
      setFormError("Tên danh mục không được để trống.");
      return;
    }
    if (editingId === null && (!SLUG_PATTERN.test(slug) || slug.length < 2)) {
      setFormError("Slug chỉ gồm chữ thường, số và dấu gạch ngang, tối thiểu 2 ký tự.");
      return;
    }
    setBusy(true);
    try {
      if (editingId === null) {
        await api.admin.createCategory({ name, slug });
        toast(`Đã thêm danh mục ${name}.`);
      } else {
        await api.admin.updateCategory(editingId, { name });
        toast(`Đã cập nhật ${name}.`);
      }
      closeForm();
      await load();
    } catch (err) {
      setFormError(
        errorMessage(
          err,
          editingId === null ? "Không thêm được danh mục." : "Không cập nhật được danh mục.",
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
      await api.admin.deleteCategory(removing.id);
      toast(`Đã xoá ${removing.name}.`);
      setRemoving(null);
      await load();
    } catch (err) {
      toast(errorMessage(err, "Không xoá được danh mục."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Danh mục">
      <div className="mb-6 flex h-11 items-center justify-between gap-4 border-b border-line pb-4">
        <span className="text-base font-semibold leading-none text-ink">
          {categories.length} danh mục
        </span>
        <Button type="button" size="sm" onClick={openCreate}>
          Thêm danh mục
        </Button>
      </div>

      <ErrorNote message={error} />

      <div>
        {loading ? (
          <p className="text-muted">Đang tải...</p>
        ) : categories.length === 0 ? (
          <p className="rounded-card border border-line bg-bg px-4 py-10 text-center text-muted">
            Chưa có danh mục nào.
          </p>
        ) : (
          <Table head={["Danh mục", "Slug", "Số sản phẩm", "Thao tác"]}>
            {categories.map((category) => (
              <Row key={category.id}>
                <Cell className="font-medium">{category.name}</Cell>
                <Cell className="text-muted">{category.slug}</Cell>
                <Cell className="tabular-nums">{category._count?.products ?? 0}</Cell>
                <Cell className="whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openEdit(category)}
                      className="rounded-btn border border-line px-2.5 py-1 text-xs hover:bg-subtle disabled:opacity-50"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRemoving(category)}
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
        <Modal title={editingId === null ? "Thêm danh mục" : "Sửa danh mục"} onClose={closeForm}>
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Tên danh mục">
              <TextInput
                name="name"
                value={form.name}
                required
                maxLength={100}
                disabled={busy}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Slug">
              <TextInput
                name="slug"
                value={form.slug}
                required
                maxLength={50}
                readOnly={editingId !== null}
                disabled={editingId !== null || busy}
                className="disabled:bg-subtle disabled:text-muted"
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
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
        <Modal title="Xoá danh mục" onClose={() => setRemoving(null)}>
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

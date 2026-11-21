"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Brand, Category, Pagination, Product, ProductInput } from "@/lib/types";
import { SPEC_BY_SLUG, type SpecField } from "@/lib/product-specs";
import { money } from "@/lib/format";
import { useStore } from "@/components/store";
import { Button } from "@/components/ui";
import {
  Cell,
  ErrorNote,
  Field,
  Modal,
  Note,
  Pager,
  Row,
  Select,
  Switch,
  Table,
  TextInput,
  Thumb,
  Toolbar,
  errorMessage,
  labelClass,
} from "@/components/admin/ui";

type Filters = { q: string; categoryId: string; brandId: string; isActive: string };
type Form = {
  id: number | null;
  hasDetail: boolean;
  name: string;
  categoryId: string;
  brandId: string;
  price: string;
  stockQuantity: string;
  color: string;
  imageUrl: string;
  isActive: boolean;
  detail: Record<string, string | boolean>;
};

const EMPTY_FILTERS: Filters = { q: "", categoryId: "", brandId: "", isActive: "all" };

const EMPTY_FORM: Form = {
  id: null,
  hasDetail: false,
  name: "",
  categoryId: "",
  brandId: "",
  price: "",
  stockQuantity: "0",
  color: "",
  imageUrl: "",
  isActive: true,
  detail: {},
};

const specOf = (categoryId: string, categories: Category[]) =>
  SPEC_BY_SLUG[categories.find((category) => String(category.id) === categoryId)?.slug ?? ""] ?? null;

/** Chỉ gửi trường có giá trị; field bắt buộc rỗng thì báo ngay trên form. */
function buildPayload(form: Form, spec: SpecField[] | null): { payload: ProductInput; missing: string | null } {
  const payload: ProductInput = {
    name: form.name.trim(),
    categoryId: Number(form.categoryId),
    price: Number(form.price),
    stockQuantity: Number(form.stockQuantity),
    color: form.color.trim() || undefined,
    imageUrl: form.imageUrl.trim(),
    isActive: form.isActive,
  };
  // brandId bắt buộc khi tạo; khi sửa thì bỏ trống = giữ thương hiệu cũ.
  if (form.brandId) payload.brandId = Number(form.brandId);
  if (form.id === null && !payload.brandId) {
    return { payload, missing: "Chọn thương hiệu cho sản phẩm." };
  }
  if (!spec) return { payload, missing: null };

  const detail: Record<string, unknown> = {};
  for (const field of spec) {
    const value = form.detail[field.key];
    if (field.kind === "boolean") {
      detail[field.key] = value === true;
      continue;
    }
    const text = String(value ?? "").trim();
    if (!text) {
      if (field.required) return { payload, missing: `Thiếu thông số bắt buộc: ${field.label}` };
      continue;
    }
    detail[field.key] = field.kind === "number" ? Number(text) : text;
  }
  payload.detail = detail;
  return { payload, missing: null };
}

function defaultDetail(spec: SpecField[] | null, source?: Record<string, unknown> | null) {
  const detail: Record<string, string | boolean> = {};
  for (const field of spec ?? []) {
    const raw = source?.[field.key] ?? field.default;
    detail[field.key] =
      field.kind === "boolean" ? raw === true : raw === undefined || raw === null ? "" : String(raw);
  }
  return detail;
}

export default function AdminProductsClient() {
  const { toast } = useStore();
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<Product | null>(null);
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

  const load = useCallback(async (filters: Filters, nextPage: number) => {
    setLoading(true);
    try {
      const data = await api.admin.products({
        search: filters.q,
        categoryId: filters.categoryId,
        brandId: filters.brandId,
        isActive: filters.isActive,
        page: nextPage,
        limit: 20,
      });
      setItems(data.items);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Không tải được sản phẩm."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load(applied, page));
  }, [load, applied, page]);

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        try {
          const [nextCategories, nextBrands] = await Promise.all([
            api.admin.categories(),
            api.admin.brands(),
          ]);
          setCategories(nextCategories);
          setBrands(nextBrands);
        } catch (err) {
          setError(errorMessage(err, "Không tải được danh mục và thương hiệu."));
        }
      })();
    });
  }, []);

  const openCreate = () => {
    const first = categories[0];
    const categoryId = first ? String(first.id) : "";
    setFormError(null);
    setForm({ ...EMPTY_FORM, categoryId, detail: defaultDetail(SPEC_BY_SLUG[first?.slug ?? ""]) });
  };

  const openEdit = (product: Product) => {
    const categoryId = String(product.categoryId);
    setFormError(null);
    setForm({
      id: product.id,
      hasDetail: Boolean(product.detail),
      name: product.name,
      categoryId,
      brandId: String(product.brandId),
      price: String(product.price),
      stockQuantity: String(product.stockQuantity),
      color: product.color ?? "",
      imageUrl: product.imageUrl ?? "",
      isActive: product.isActive ?? true,
      detail: defaultDetail(SPEC_BY_SLUG[product.category?.slug ?? ""], product.detail),
    });
  };

  /** Đổi danh mục thì thông số reset theo danh mục mới; danh mục đã có thông số thì khoá chọn. */
  const changeCategory = (next: string) => {
    if (!form) return;
    setForm({
      ...form,
      categoryId: next,
      detail: defaultDetail(SPEC_BY_SLUG[categories.find((c) => String(c.id) === next)?.slug ?? ""]),
    });
  };

  const save = async () => {
    if (!form) return;
    const spec = specOf(form.categoryId, categories);
    const { payload, missing } = buildPayload(form, spec);
    if (missing) {
      setFormError(missing);
      return;
    }
    setSaving(true);
    try {
      if (form.id === null) await api.admin.createProduct(payload);
      else await api.admin.updateProduct(form.id, payload);
      toast(form.id === null ? "Đã tạo sản phẩm." : "Đã lưu sản phẩm.");
      setForm(null);
      await load(applied, page);
    } catch (err) {
      setFormError(errorMessage(err, "Không lưu được sản phẩm."));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: Product, next: boolean) => {
    try {
      await api.admin.updateProduct(product.id, { isActive: next });
      setItems((rows) =>
        rows.map((row) => (row.id === product.id ? { ...row, isActive: next } : row)),
      );
      toast(next ? `Đã mở bán ${product.name}.` : `Đã ngừng bán ${product.name}.`);
    } catch (err) {
      toast(errorMessage(err, "Không đổi được trạng thái bán."));
    }
  };

  const remove = async () => {
    if (!removing) return;
    setSaving(true);
    try {
      await api.admin.deleteProduct(removing.id);
      toast("Đã xoá sản phẩm.");
      setRemoving(null);
      await load(applied, page);
    } catch (err) {
      toast(errorMessage(err, "Không xoá được sản phẩm."));
    } finally {
      setSaving(false);
    }
  };

  const editingSpec = form ? specOf(form.categoryId, categories) : null;
  const lockCategory = Boolean(form?.hasDetail);

  return (
    <section aria-label="Danh sách sản phẩm">
      <div className="mb-6 flex h-11 items-center justify-between gap-4 border-b border-line pb-4">
        <span className="text-base font-semibold leading-none text-ink">
          {pagination ? `${pagination.total} sản phẩm` : "Đang tải..."}
        </span>
        <Button type="button" size="sm" onClick={openCreate}>
          Thêm sản phẩm
        </Button>
      </div>

      <Toolbar
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div className="min-w-[200px] flex-1">
          <label htmlFor="q" className={labelClass}>
            Tìm sản phẩm
          </label>
          <TextInput
            id="q"
            name="q"
            value={draft.q}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Tên sản phẩm..."
          />
        </div>
        <div className="w-44">
          <label htmlFor="categoryId" className={labelClass}>
            Danh mục
          </label>
          <Select
            id="categoryId"
            name="categoryId"
            value={draft.categoryId}
            onChange={(event) => updateFilter({ categoryId: event.target.value })}
          >
            <option value="">Tất cả</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <label htmlFor="brandId" className={labelClass}>
            Thương hiệu
          </label>
          <Select
            id="brandId"
            name="brandId"
            value={draft.brandId}
            onChange={(event) => updateFilter({ brandId: event.target.value })}
          >
            <option value="">Tất cả</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-36">
          <label htmlFor="isActive" className={labelClass}>
            Trạng thái
          </label>
          <Select
            id="isActive"
            name="isActive"
            value={draft.isActive}
            onChange={(event) => updateFilter({ isActive: event.target.value })}
          >
            <option value="all">Tất cả</option>
            <option value="true">Đang bán</option>
            <option value="false">Ngừng bán</option>
          </Select>
        </div>
      </Toolbar>

      <ErrorNote message={error} />

      {loading ? (
        <p className="text-muted">Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="rounded-card border border-line bg-bg px-4 py-10 text-center text-muted">
          Không có sản phẩm nào.
        </p>
      ) : (
        <Table head={["Ảnh", "Sản phẩm", "Danh mục", "Thương hiệu", "Giá", "Tồn", "Bán", "Thao tác"]}>
          {items.map((product) => (
            <Row key={product.id}>
              <Cell>
                <Thumb src={product.imageUrl} alt={product.name} />
              </Cell>
              <Cell className="max-w-72">
                <p className="truncate font-medium">{product.name}</p>
                <p className="text-xs text-muted">#{product.id} · {product.color ?? "Không màu"}</p>
              </Cell>
              <Cell className="whitespace-nowrap">{product.category?.name ?? "—"}</Cell>
              <Cell className="whitespace-nowrap">{product.brand?.name ?? "—"}</Cell>
              <Cell className="tabular-nums whitespace-nowrap">{money(product.price)}</Cell>
              <Cell className="tabular-nums">{product.stockQuantity}</Cell>
              <Cell>
                <Switch
                  checked={product.isActive ?? true}
                  label={`Bán ${product.name}`}
                  onChange={(next) => void toggleActive(product, next)}
                />
              </Cell>
              <Cell className="whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => openEdit(product)}
                  className="rounded-btn px-2.5 py-1 text-xs text-accent hover:bg-accent-soft"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => setRemoving(product)}
                  className="rounded-btn px-2.5 py-1 text-xs text-danger hover:bg-subtle"
                >
                  Xoá
                </button>
              </Cell>
            </Row>
          ))}
        </Table>
      )}

      {pagination ? (
        <Pager pagination={pagination} busy={loading} onPage={(next) => setPage(next)} />
      ) : null}

      {form ? (
        <Modal title={form.id === null ? "Thêm sản phẩm" : `Sửa #${form.id}`} onClose={() => setForm(null)}>
          <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên sản phẩm" className="sm:col-span-2">
              <TextInput
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </Field>
            <Field label="Danh mục">
              <Select
                value={form.categoryId}
                disabled={lockCategory}
                onChange={(event) => changeCategory(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={form.id === null ? "Thương hiệu *" : "Thương hiệu"}>
              <Select
                value={form.brandId}
                onChange={(event) => setForm({ ...form, brandId: event.target.value })}
              >
                <option value="">—</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Giá (đ)">
              <TextInput
                type="number"
                min="0"
                step="1000"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                required
              />
            </Field>
            <Field label="Tồn kho">
              <TextInput
                type="number"
                min="0"
                step="1"
                value={form.stockQuantity}
                onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })}
                required
              />
            </Field>
            <Field label="Màu sắc">
              <TextInput
                value={form.color}
                onChange={(event) => setForm({ ...form, color: event.target.value })}
                placeholder="Đen, Trắng…"
              />
            </Field>
            <Field label="Link ảnh">
              <TextInput
                type="url"
                value={form.imageUrl}
                onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
                placeholder="https://…"
                required
              />
            </Field>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch
                checked={form.isActive}
                label="Trạng thái mở bán"
                onChange={(next) => setForm({ ...form, isActive: next })}
              />
              <span className="text-sm">Đang bán</span>
              <Thumb src={form.imageUrl} />
            </div>
          </div>

          {editingSpec ? (
            <fieldset className="mt-5 border-t border-line pt-4">
              <legend className="text-sm font-semibold">
                Thông số · {categories.find((c) => String(c.id) === form.categoryId)?.name}
              </legend>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {editingSpec.map((field) =>
                  field.kind === "boolean" ? (
                    <div key={field.key} className="flex items-center gap-3 sm:col-span-2">
                      <Switch
                        checked={form.detail[field.key] === true}
                        label={field.label}
                        onChange={(next) =>
                          setForm({
                            ...form,
                            detail: { ...form.detail, [field.key]: next },
                          })
                        }
                      />
                      <span className="text-sm">{field.label}</span>
                    </div>
                  ) : (
                    <Field key={field.key} label={field.required ? `${field.label} *` : field.label}>
                      {field.kind === "select" ? (
                        <Select
                          value={String(form.detail[field.key] ?? "")}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              detail: { ...form.detail, [field.key]: event.target.value },
                            })
                          }
                        >
                          <option value="">—</option>
                          {field.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <TextInput
                          type={field.kind === "number" ? "number" : "text"}
                          value={String(form.detail[field.key] ?? "")}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              detail: { ...form.detail, [field.key]: event.target.value },
                            })
                          }
                        />
                      )}
                    </Field>
                  ),
                )}
              </div>
              <div className="mt-3">
                <Note>
                  {lockCategory
                    ? "Sản phẩm đã có thông số nên không đổi được danh mục."
                    : "Danh mục này bắt buộc thông số có dấu *."}
                </Note>
              </div>
            </fieldset>
          ) : null}

          <div className="mt-4">
            <ErrorNote message={formError} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setForm(null)}>
              Huỷ
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
          </form>
        </Modal>
      ) : null}

      {removing ? (
        <Modal title={`Xoá ${removing.name}?`} onClose={() => setRemoving(null)}>
          <Note>
            Sản phẩm ngừng bán thì chỉ cần tắt công tắc “Đang bán”. Xoá chỉ dùng khi nhập nhầm, và
            không xoá được sản phẩm đã có trong đơn hàng.
          </Note>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRemoving(null)}>
              Giữ lại
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={() => void remove()}>
              {saving ? "Đang xoá..." : "Xoá sản phẩm"}
            </Button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

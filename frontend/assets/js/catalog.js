import { api, escapeHtml, renderProductList, setupPage } from "./common.js";

const PAGE_SIZE = 9;

const state = {
  page: 1,
  slug: "",
  brandId: "",
  sort: "newest",
  q: "",
  smart: false,
};

const elements = {
  filter: document.querySelector("[data-filters]"),
  category: document.querySelector("[data-category-filter]"),
  count: document.querySelector("[data-result-count]"),
  analysis: document.querySelector("[data-analysis]"),
  products: document.querySelector("[data-products]"),
  pagination: document.querySelector("[data-pagination]"),
  brand: document.querySelector("#filter-brand"),
  sort: document.querySelector("#filter-sort"),
  query: document.querySelector("#filter-q"),
  smart: document.querySelector("#filter-smart"),
};

const money = (value) => `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)}đ`;

const readStateFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  state.page = Math.max(1, Number(params.get("page")) || 1);
  state.slug = params.get("slug") ?? "";
  state.brandId = params.get("brandId") ?? "";
  state.sort = params.get("sort") ?? "newest";
  state.q = params.get("q") ?? "";
  state.smart = params.get("smart") === "1";
};

const writeStateToUrl = (replace = false) => {
  const params = new URLSearchParams();
  if (state.page > 1) params.set("page", String(state.page));
  if (state.slug) params.set("slug", state.slug);
  if (state.brandId) params.set("brandId", state.brandId);
  if (state.sort !== "newest") params.set("sort", state.sort);
  if (state.q) params.set("q", state.q);
  if (state.smart) params.set("smart", "1");

  const url = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
  window.history[replace ? "replaceState" : "pushState"]({}, "", url);
};

const syncForm = () => {
  if (elements.query) elements.query.value = state.q;
  if (elements.brand) elements.brand.value = state.brandId;
  if (elements.sort) elements.sort.value = state.sort;
  if (elements.smart) elements.smart.value = state.smart ? "1" : "0";
};

const describeAnalysis = (analysis, query) => {
  if (!analysis) return `Chưa nhận ra ràng buộc nào trong “${query}”, đang tìm theo tên và thương hiệu.`;

  const parts = [];
  const constraints = analysis.hardConstraints ?? {};

  if (constraints.categories?.length) {
    const names = constraints.categories
      .map((slug) => slug.replace(/-/g, " "))
      .join(", ");
    parts.push(`danh mục ${names}`);
  }
  if (constraints.brands?.length) parts.push(`hãng ${constraints.brands.join(", ")}`);
  if (constraints.max_price) parts.push(`giá dưới ${money(constraints.max_price)}`);
  if (constraints.min_price) parts.push(`giá trên ${money(constraints.min_price)}`);
  if (constraints.connectivity?.length) {
    const map = { wired: "có dây", wireless: "không dây", tri_mode: "3 chế độ" };
    parts.push(constraints.connectivity.map((code) => map[code] ?? code).join(" hoặc "));
  }
  if (constraints.max_weight_g) parts.push(`nặng dưới ${constraints.max_weight_g} g`);
  if (constraints.layout) parts.push(`layout ${constraints.layout}`);

  if (parts.length === 0) {
    return `Chưa nhận ra ràng buộc nào trong “${query}”, đang tìm theo tên và thương hiệu.`;
  }

  return `Hiểu là: ${parts.join(", ")}.`;
};

const renderCategories = async () => {
  try {
    const categories = await api.categories();
    elements.category.innerHTML = [
      `<li><a href="san-pham.html"${state.slug ? "" : ' aria-current="true"'}>Tất cả</a></li>`,
      ...categories.map(
        (category) =>
          `<li><a href="san-pham.html?slug=${encodeURIComponent(category.slug)}"${
            state.slug === category.slug ? ' aria-current="true"' : ""
          }>${escapeHtml(category.name)}</a></li>`,
      ),
    ].join("");
  } catch {
    elements.category.innerHTML = "";
  }
};

const renderBrands = async () => {
  try {
    const brands = await api.brands();
    elements.brand.innerHTML = [
      '<option value="">Tất cả</option>',
      ...brands.map(
        (brand) => `<option value="${brand.id}">${escapeHtml(brand.name)}</option>`,
      ),
    ].join("");
    elements.brand.value = state.brandId;
  } catch {
    elements.brand.innerHTML = '<option value="">Tất cả</option>';
  }
};

const renderPagination = (pagination) => {
  if (!pagination || pagination.totalPages <= 1) {
    elements.pagination.innerHTML = "";
    return;
  }

  const { page, totalPages } = pagination;
  const link = (targetPage, label) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(targetPage));
    return `<a href="san-pham.html?${params.toString()}">${label}</a>`;
  };

  elements.pagination.innerHTML = [
    page > 1 ? link(page - 1, "Trang trước") : "",
    `<span>Trang ${page} / ${totalPages}</span>`,
    page < totalPages ? link(page + 1, "Trang sau") : "",
  ]
    .filter(Boolean)
    .join("");
};

const renderEmpty = (message) => {
  elements.products.innerHTML = `<li class="product-grid__empty">${escapeHtml(message)}</li>`;
};

const load = async () => {
  const commonParams = {
    page: state.page,
    limit: PAGE_SIZE,
    sort: state.sort,
    brandId: state.brandId || undefined,
    slug: state.slug || undefined,
  };

  try {
    if (state.smart && state.q) {
      const data = await api.smartSearch({
        q: state.q,
        page: state.page,
        limit: PAGE_SIZE,
      });
      elements.analysis.textContent = describeAnalysis(data.analysis, state.q);
      elements.analysis.hidden = false;
      if (data.items.length === 0) {
        renderEmpty("Không tìm thấy sản phẩm nào phù hợp. Hãy thử từ khóa khác.");
        elements.count.textContent = "0 sản phẩm phù hợp";
      } else {
        renderProductList(elements.products, data.items);
        elements.count.textContent = `${data.pagination.total} sản phẩm phù hợp`;
      }
      renderPagination(data.pagination);
      return;
    }

    const data = await api.products({ ...commonParams, search: state.q || undefined });
    elements.analysis.hidden = true;
    if (data.items.length === 0) {
      renderEmpty("Không có sản phẩm nào khớp bộ lọc này.");
      elements.count.textContent = "0 sản phẩm";
    } else {
      renderProductList(elements.products, data.items);
      elements.count.textContent = `${data.pagination.total} sản phẩm`;
    }
    renderPagination(data.pagination);
  } catch (error) {
    renderEmpty(error.message);
    elements.count.textContent = "Không thể tải sản phẩm.";
    elements.pagination.innerHTML = "";
    elements.analysis.hidden = true;
  }
};

const applyForm = (event) => {
  event.preventDefault();
  const data = new FormData(elements.filter);
  state.q = data.get("q")?.toString().trim() ?? "";
  state.brandId = data.get("brandId")?.toString() ?? "";
  state.sort = data.get("sort")?.toString() ?? "newest";
  state.smart = data.get("smart") === "1";
  state.page = 1;
  writeStateToUrl();
  syncForm();
  load();
  renderCategories();
};

const start = async () => {
  readStateFromUrl();
  syncForm();
  setupPage();

  elements.filter.addEventListener("submit", applyForm);
  window.addEventListener("popstate", () => {
    readStateFromUrl();
    syncForm();
    renderCategories();
    load();
  });

  await Promise.all([renderCategories(), renderBrands()]);
  await load();
};

start();

import {
  addProductToCart,
  api,
  categoryIcon,
  colorLabel,
  escapeHtml,
  money,
  PLACEHOLDER_IMAGE,
  ratingMarkup,
  renderProductList,
  resolveImage,
  setupPage,
} from "./common.js";

setupPage();

const DETAIL_LABELS = {
  connectivity: "Kết nối",
  handOrientation: "Kiểu cầm",
  weightG: "Trọng lượng",
  pollingRateHz: "Polling rate",
  switchType: "Loại switch",
  sensor: "Cảm biến",
  layout: "Layout",
  hasRapidTrigger: "Rapid trigger",
  hasHotswap: "Hot-swap",
  supportMacos: "Hỗ trợ macOS",
  switch: "Switch",
  headphoneType: "Kiểu tai nghe",
  hasMic: "Có micro",
  hasAnc: "Chống ồn",
  setupCategory: "Loại",
  maxLoadKg: "Tải trọng",
  padType: "Chất liệu",
  mouseControl: "Kiểu di chuột",
  speed: "Tốc độ",
  surface: "Bề mặt",
  base: "Đế",
  size: "Kích thước",
};

const VALUE_LABELS = {
  wired: "Có dây",
  wireless: "Không dây",
  tri_mode: "3 chế độ",
  wired_3_5mm: "Jack 3.5mm",
  "wired_3.5mm": "Jack 3.5mm",
  wireless_2_4g: "Không dây 2.4GHz",
  "wireless_2.4g": "Không dây 2.4GHz",
  bluetooth: "Bluetooth",
  symmetrical: "Đối xứng",
  ergonomic: "Công thái học",
  in_ear: "Nhét tai",
  over_ear: "Chụp tai",
  on_ear: "On-ear",
  soundcard: "Soundcard",
  chair: "Ghế",
  desk: "Bàn",
  arm: "Arm màn hình",
  accessory: "Phụ kiện",
};

const IGNORED_KEYS = new Set(["id", "productId", "createdAt"]);

const formatSpecValue = (key, value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (key === "weightG") return `${value} g`;
  if (key === "pollingRateHz") return `${value} Hz`;
  if (key === "maxLoadKg") return `${value} kg`;
  return VALUE_LABELS[value] ?? String(value);
};

const renderSpecs = (detail) => {
  const container = document.querySelector("[data-specs]");
  const body = document.querySelector("[data-spec-rows]");
  if (!detail) return;

  const rows = Object.entries(detail)
    .filter(([key]) => !IGNORED_KEYS.has(key))
    .map(([key, value]) => [key, formatSpecValue(key, value)])
    .filter(([, value]) => value !== null);

  if (rows.length === 0) return;

  body.innerHTML = rows
    .map(
      ([key, value]) =>
        `<tr><th scope="row">${escapeHtml(DETAIL_LABELS[key] ?? key)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  container.hidden = false;
};

const renderProduct = (product) => {
  const section = document.querySelector("[data-detail]");
  section.hidden = false;

  document.title = `${product.name} — Gear Shop`;
  document.querySelector("[data-media]").innerHTML = `
    <span class="detail__art" aria-hidden="true">${categoryIcon(product.category?.slug)}</span>
    <img src="${escapeHtml(resolveImage(product.imageUrl))}" alt="${escapeHtml(product.name)}"
         width="600" height="400" fetchpriority="high"
         onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}'">`;
  document.querySelector("[data-brand]").textContent = product.brand?.name ?? "Gear Shop";
  document.querySelector("[data-name]").textContent = product.name;
  document.querySelector("[data-price]").textContent = money(product.price);

  const category = document.querySelector("[data-category]");
  if (category) {
    category.textContent = product.category?.name ?? "";
    category.hidden = !product.category?.name;
  }

  const rating = document.querySelector("[data-rating]");
  if (rating) {
    rating.innerHTML = ratingMarkup(product.rating);
    rating.hidden = !rating.innerHTML;
  }

  const color = colorLabel(product.color);
  const colorElement = document.querySelector("[data-color]");
  if (colorElement) {
    if (color) {
      colorElement.innerHTML = `<span class="color-dot" style="--dot:${color.css}"></span> Màu ${escapeHtml(color.label)}`;
      colorElement.hidden = false;
    } else {
      colorElement.hidden = true;
    }
  }

  const stock = document.querySelector("[data-stock]");
  const available = product.stockQuantity > 0;
  stock.textContent = available ? `Còn ${product.stockQuantity} trong kho` : "Hết hàng";
  stock.classList.toggle("is-out", !available);

  const addButton = document.querySelector("[data-add]");
  addButton.disabled = !available;
  if (!available) addButton.textContent = "Hết hàng";

  addButton.addEventListener("click", async () => {
    const input = document.querySelector("[data-quantity]");
    const quantity = Math.min(Math.max(1, Number(input.value) || 1), 99);
    addButton.disabled = true;
    try {
      await addProductToCart(product, quantity);
    } catch (error) {
      const container = document.querySelector("[data-error]");
      container.hidden = false;
      container.textContent = error.message;
    } finally {
      addButton.disabled = product.stockQuantity === 0;
    }
  });

  renderSpecs(product.detail);
};

const renderSimilar = async (productId) => {
  try {
    const data = await api.similar(productId, 4);
    if (data.items.length === 0) return;
    const section = document.querySelector("[data-similar-section]");
    section.hidden = false;
    renderProductList(document.querySelector("[data-similar]"), data.items);
  } catch {
    // ML tắt vẫn có fallback ở server; nếu cả hai lỗi thì bỏ qua khối này.
  }
};

const start = async () => {
  const id = Number(new URLSearchParams(window.location.search).get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    const error = document.querySelector("[data-error]");
    error.hidden = false;
    error.textContent = "Không tìm thấy sản phẩm. Hãy chọn một sản phẩm trong danh sách.";
    return;
  }

  try {
    const product = await api.product(id);
    renderProduct(product);
    renderSimilar(product.id);
  } catch (error) {
    const container = document.querySelector("[data-error]");
    container.hidden = false;
    container.textContent = error.message;
    document.querySelector("[data-detail]").hidden = true;
  }
};

start();

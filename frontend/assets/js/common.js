import { api } from "./api.js";
import { auth, escapeHtml, guestCart, money } from "./store.js";

export { money, dateTime, escapeHtml, ORDER_STATUS_LABELS } from "./store.js";
export { api } from "./api.js";
export { auth, guestCart } from "./store.js";

let toastTimer = null;

export const toast = (message) => {
  let element = document.querySelector(".toast");
  if (!element) {
    element = document.createElement("div");
    element.className = "toast";
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    document.body.append(element);
  }

  element.textContent = message;
  element.dataset.visible = "true";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    element.dataset.visible = "false";
  }, 2600);
};

export const productHref = (product) => `chi-tiet.html?id=${product.id}`;

export const PLACEHOLDER_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

document.addEventListener(
  "error",
  (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || image.dataset.fallback === "true") return;
    image.dataset.fallback = "true";
    image.src = PLACEHOLDER_IMAGE;
  },
  true,
);

const imageFallback = `this.onerror=null;this.src='${PLACEHOLDER_IMAGE}'`;

const STOCK_IMAGE_HOSTS = new Set([
  "picsum.photos",
  "fastly.picsum.photos",
  "images.unsplash.com",
  "source.unsplash.com",
  "loremflickr.com",
  "placehold.co",
  "via.placeholder.com",
  "dummyimage.com",
]);

/** Ảnh demo lấy từ kho ảnh ngẫu nhiên không phải ảnh sản phẩm: thay bằng nền trung tính. */
export const resolveImage = (url) => {
  if (!url) return PLACEHOLDER_IMAGE;
  try {
    const { hostname } = new URL(url, window.location.href);
    return STOCK_IMAGE_HOSTS.has(hostname) ? PLACEHOLDER_IMAGE : url;
  } catch {
    return PLACEHOLDER_IMAGE;
  }
};

export const CATEGORY_LABELS = {
  chuot: "Chuột gaming",
  "ban-phim": "Bàn phím cơ & HE",
  "lot-chuot": "Lót chuột",
  "tai-nghe": "Tai nghe gaming",
  ghe: "Ghế công thái học",
  "phu-kien-cong-thai-hoc": "Phụ kiện công thái học",
  "arm-man-hinh": "Arm màn hình",
  ban: "Bàn nâng hạ",
  soundcard: "Soundcard",
};

const ICONS = {
  chuot: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="12" y="5" width="16" height="30" rx="8"/><path d="M20 5v12"/><path class="icon-accent" d="M20 9v4"/><path d="M12 17h16"/></svg>`,
  "ban-phim": `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="12" width="32" height="17" rx="3"/><path class="icon-accent" d="M8 17h2M13 17h2M18 17h2M23 17h2M28 17h4M8 21h2M13 21h2M18 21h2M23 21h2M28 21h4M8 25h6M17 25h6M26 25h6"/></svg>`,
  "lot-chuot": `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="30" height="20" rx="3"/><path d="M10 17h8"/><path class="icon-accent" d="M25 16h3v10h-3z"/></svg>`,
  "tai-nghe": `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 22v-3a12 12 0 0 1 24 0v3"/><rect x="5" y="21" width="6" height="11" rx="2"/><rect x="29" y="21" width="6" height="11" rx="2"/><path class="icon-accent" d="M35 27c0 4-4 6-8 6"/></svg>`,
  ghe: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 5h12v14H14z"/><path d="M10 21h20v4H10z"/><path d="M20 25v8M14 33h12"/><path class="icon-accent" d="M26 9h5v10h-5"/></svg>`,
  ban: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 14h30v4H5z"/><path d="M9 18v16M31 18v16"/><path class="icon-accent" d="M9 24h10v6H9z"/></svg>`,
  "arm-man-hinh": `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 33h10M13 33V18"/><path d="M13 18h12a4 4 0 0 0 4-4V9"/><rect x="24" y="5" width="11" height="8" rx="2"/><path class="icon-accent" d="M13 23h8"/></svg>`,
  "phu-kien-cong-thai-hoc": `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 26c0-5 4-9 9-9h6c5 0 9 4 9 9v4H8z"/><path d="M14 17V9a3 3 0 0 1 6 0v8"/><path class="icon-accent" d="M20 17v6"/></svg>`,
  soundcard: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="12" width="30" height="18" rx="3"/><circle cx="13" cy="21" r="3"/><circle cx="22" cy="21" r="3"/><path class="icon-accent" d="M28 18v6M31 18v6"/></svg>`,
  default: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/><rect x="23" y="7" width="10" height="10" rx="2"/><rect x="7" y="23" width="10" height="10" rx="2"/><rect x="23" y="23" width="10" height="10" rx="2" class="icon-accent"/></svg>`,
};

export const categoryIcon = (slug) => ICONS[slug] ?? ICONS.default;

export const colorLabel = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const key = text.toLowerCase().normalize("NFC");
  const hasBlack = key.includes("đen") || key.includes("den");
  const hasRed = key.includes("đỏ") || key.includes("do");
  if (hasBlack && hasRed) {
    return { label: text, css: "linear-gradient(135deg, #111 50%, #d92d20 50%)" };
  }
  if (hasBlack) return { label: text, css: "#111" };
  if (hasRed) return { label: text, css: "#d92d20" };
  if (key.includes("trắng") || key.includes("trang")) return { label: text, css: "#fff" };
  if (key.includes("xanh")) return { label: text, css: "#2f5bea" };
  return { label: text, css: "#8e8e93" };
};

export const ratingMarkup = (rating) => {
  const value = Number(rating);
  if (!Number.isFinite(value) || value <= 0) return "";
  const rounded = Math.round(value);
  return `<span class="rating" aria-label="Đánh giá ${value.toFixed(1)} trên 5">${[1, 2, 3, 4, 5]
    .map(
      (index) =>
        `<span class="rating__star${index <= rounded ? " is-filled" : ""}" aria-hidden="true">★</span>`,
    )
    .join("")}<span class="rating__value">${value.toFixed(1)}</span></span>`;
};

/** Ảnh + tên + giá. Không thêm nhãn, badge hay nút riêng cho từng món. */
export const productCard = (product) => {
  const color = colorLabel(product.color);
  const eyebrow = product.category?.name ?? product.brand?.name ?? "Gear Shop";
  return `
  <li>
    <a class="product" href="${productHref(product)}">
      <div class="product__media">
        <span class="product__art" aria-hidden="true">${categoryIcon(product.category?.slug)}</span>
        <img src="${escapeHtml(resolveImage(product.imageUrl))}" alt="${escapeHtml(product.name)}"
             width="600" height="400" loading="lazy" onerror="${imageFallback}">
        ${product.isInStock === false ? '<span class="product__badge">Hết hàng</span>' : ""}
      </div>
      <div class="product__body">
        <p class="product__eyebrow">${escapeHtml(eyebrow)}</p>
        <p class="product__name">${escapeHtml(product.name)}</p>
        <div class="product__meta">
          <span class="product__price">${money(product.price)}</span>
          ${ratingMarkup(product.rating)}
        </div>
        <div class="product__foot">
          ${
            color
              ? `<span class="product__color"><span class="color-dot" style="--dot:${color.css}"></span>${escapeHtml(color.label)}</span>`
              : ""
          }
          <span class="product__stock${product.isInStock === false ? " is-out" : ""}">${product.isInStock === false ? "Tạm hết" : "Sẵn hàng"}</span>
        </div>
      </div>
    </a>
  </li>`;
};

export const renderProductList = (container, products) => {
  container.innerHTML = products.map(productCard).join("");
};

export const renderCartCount = async () => {
  const targets = document.querySelectorAll("[data-cart-count]");
  if (targets.length === 0) return;

  let count = guestCart.count();
  if (auth.isLoggedIn()) {
    try {
      const cart = await api.cart();
      count = cart.totalItems;
    } catch {
      count = 0;
    }
  }

  for (const target of targets) {
    target.textContent = target.hasAttribute("data-cart-badge")
      ? count > 0
        ? String(count)
        : ""
      : count > 0
        ? ` (${count})`
        : "";
  }
};

/** Thêm vào giỏ: khách dùng giỏ local, đã đăng nhập thì ghi thẳng lên server. */
export const addProductToCart = async (product, quantity = 1) => {
  if (auth.isLoggedIn()) {
    await api.addToCart(product.id, quantity);
    toast(`Đã thêm ${product.name} vào giỏ.`);
  } else {
    guestCart.add(product, quantity);
    toast(`Đã thêm ${product.name} vào giỏ. Giỏ sẽ đồng bộ khi bạn đăng nhập.`);
  }
  await renderCartCount();
};

/** Đẩy giỏ khách lên server sau khi đăng nhập. Lỗi từng dòng không chặn các dòng khác. */
export const syncGuestCart = async () => {
  const items = guestCart.items();
  if (items.length === 0) return;

  for (const item of items) {
    try {
      await api.addToCart(item.productId, item.quantity);
    } catch {
      // Sản phẩm có thể đã hết hàng hoặc bị xoá; bỏ qua để không chặn phần còn lại.
    }
  }
  guestCart.clear();
  await renderCartCount();
};

const headerMarkup = `
  <div class="announcement">
    <div class="container announcement__inner">
      <span>Giao nhanh 0–3 ngày</span>
      <span class="announcement__dot" aria-hidden="true">•</span>
      <span>Miễn phí ship từ 1 triệu</span>
      <span class="announcement__dot" aria-hidden="true">•</span>
      <span>Bảo hành gọn, xử lý nhanh</span>
    </div>
  </div>
  <div class="container site-header__inner">
    <a class="wordmark" href="index.html" aria-label="Gear Shop — về trang chủ">
      <span class="wordmark__mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="17.5" stroke="currentColor" stroke-width="2"/>
          <path d="M26 14.5A8 8 0 1 0 26 25.5V20h-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="31" cy="9" r="2.5" fill="var(--accent)"/>
        </svg>
      </span>
      <span class="wordmark__text">Gear Shop</span>
    </a>

    <nav class="site-nav" id="site-nav" aria-label="Chính">
      <div class="site-nav__head">
        <span>Menu</span>
        <button class="nav-close" type="button" data-nav-close aria-label="Đóng menu">×</button>
      </div>
      <form class="nav-search" data-header-search role="search">
        <input type="search" name="q" placeholder="Tìm chuột, bàn phím..." aria-label="Tìm sản phẩm" />
        <button type="submit" aria-label="Tìm sản phẩm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>
        </button>
      </form>
      <a href="san-pham.html">Sản phẩm</a>
      <a href="gio-hang.html">Giỏ hàng<span data-cart-count></span></a>
      <a href="don-hang.html">Đơn hàng</a>
      <a href="dang-nhap.html" data-account-link>Đăng nhập</a>
    </nav>

    <div class="header-actions">
      <form class="header-search" data-header-search role="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>
        <input type="search" name="q" placeholder="Tìm chuột, bàn phím..." aria-label="Tìm sản phẩm" />
      </form>
      <a class="header-icon" href="dang-nhap.html" data-account-icon aria-label="Tài khoản">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.5 3.5-5.5 7-5.5s6.2 2 7 5.5"/></svg>
      </a>
      <a class="header-icon header-cart" href="gio-hang.html" aria-label="Giỏ hàng">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>
        <span data-cart-count data-cart-badge></span>
      </a>
      <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="site-nav" aria-label="Mở menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
    </div>
  </div>
  <div class="nav-backdrop" data-nav-backdrop hidden></div>
`;

const footerMarkup = `
  <div class="footer-newsletter">
    <div class="container footer-newsletter__inner">
      <div>
        <p class="footer-newsletter__eyebrow">Gear Shop</p>
        <h2>Nhận tin khuyến mãi</h2>
        <p>Nhận voucher 5% ngay sau khi đăng ký và cập nhật gear mới.</p>
      </div>
      <form class="footer-newsletter__form" data-newsletter-form>
        <label class="visually-hidden" for="footer-email">Email</label>
        <input id="footer-email" type="email" name="email" placeholder="Email" required />
        <button class="btn btn--primary" type="submit">Đăng ký</button>
      </form>
    </div>
  </div>
  <div class="container footer-grid">
    <div class="footer-col footer-brand">
      <a class="wordmark wordmark--footer" href="index.html" aria-label="Gear Shop — về trang chủ">
        <span class="wordmark__mark" aria-hidden="true">
          <svg viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="17.5" stroke="currentColor" stroke-width="2"/>
            <path d="M26 14.5A8 8 0 1 0 26 25.5V20h-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="31" cy="9" r="2.5" fill="var(--accent)"/>
          </svg>
        </span>
        <span class="wordmark__text">Gear Shop</span>
      </a>
      <p>Gear chính hãng cho góc máy chơi game. Chọn theo thông số thật, bảo hành rõ ràng.</p>
      <div class="footer-social" aria-label="Mạng xã hội">
        <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v6h3v-6h3l1-3h-4V9Z"/></svg></a>
        <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none"/></svg></a>
        <a href="#" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.6 12 5.6 12 5.6s-5 0-6.9.5A3 3 0 0 0 3 8.2 31 31 0 0 0 2.6 12 31 31 0 0 0 3 15.8a3 3 0 0 0 2.1 2.1c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-3.8 31 31 0 0 0-.4-3.8ZM10 15V9l5.2 3L10 15Z"/></svg></a>
        <a href="#" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 4h3a5 5 0 0 0 4 4v3a8 8 0 0 1-4-1.2V15a5 5 0 1 1-4-4.9v3.2a2 2 0 1 0 1 1.7V4Z"/></svg></a>
      </div>
    </div>
    <div class="footer-col">
      <h3>Liên hệ & hỗ trợ</h3>
      <p><strong>Tư vấn mua hàng</strong><br /><a href="tel:0904135321">0904.135.321</a></p>
      <p><strong>Bảo hành & kỹ thuật</strong><br /><a href="tel:0899454393">0899.454.393</a></p>
      <p><strong>Email</strong><br /><a href="mailto:hello@gearshop.vn">hello@gearshop.vn</a></p>
      <p><strong>Showroom</strong><br />89 Hồ Văn Huê, TP.HCM<br />8:30 – 20:00 hằng ngày</p>
    </div>
    <div class="footer-col">
      <h3>Chính sách & hỗ trợ</h3>
      <a href="#">Chính sách giao hàng</a>
      <a href="#">Đổi trả & hoàn tiền</a>
      <a href="#">Bảo hành & sửa chữa</a>
      <a href="#">Bảo vệ giá 31 ngày</a>
      <a href="#">Chính sách bảo mật</a>
      <a href="#">Điều khoản dịch vụ</a>
    </div>
    <div class="footer-col">
      <h3>Ưu đãi & chương trình</h3>
      <a href="san-pham.html">Gear bán chạy</a>
      <a href="san-pham.html?sort=price_asc">Gear giá tốt</a>
      <a href="gio-hang.html">Giỏ hàng</a>
      <a href="don-hang.html">Đơn hàng</a>
      <a href="dang-nhap.html">Tài khoản</a>
    </div>
  </div>
  <div class="container footer-bottom">
    <span>© 2026 Gear Shop. All rights reserved.</span>
    <span>Thiết kế lấy cảm hứng từ Phong Cách Xanh.</span>
  </div>
`;

const renderShell = () => {
  const header = document.querySelector("[data-site-header]");
  if (header) header.innerHTML = headerMarkup;
  const footer = document.querySelector("[data-site-footer]");
  if (footer) footer.innerHTML = footerMarkup;
};

const setupHeaderSearch = () => {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q") ?? "";
  const forms = document.querySelectorAll("[data-header-search]");

  for (const form of forms) {
    const input = form.querySelector("input[name=q]");
    if (input && query) input.value = query;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = form.querySelector("input[name=q]")?.value.trim() ?? "";
      window.location.href = value
        ? `san-pham.html?q=${encodeURIComponent(value)}`
        : "san-pham.html";
    });
  }
};

const setupNewsletter = () => {
  for (const form of document.querySelectorAll("[data-newsletter-form]")) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.querySelector("input[type=email]");
      if (input && !input.checkValidity()) {
        input.reportValidity();
        return;
      }
      form.reset();
      toast("Đã đăng ký nhận tin khuyến mãi.");
    });
  }
};

export const setupHeader = () => {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector(".site-nav");
  const backdrop = document.querySelector("[data-nav-backdrop]");
  const page = window.location.pathname.split("/").pop() || "index.html";
  const activePage = page === "chi-tiet.html" ? "san-pham.html" : page;

  if (nav) {
    for (const link of nav.querySelectorAll("a:not([data-account-link])")) {
      if (link.getAttribute("href") === activePage) link.setAttribute("aria-current", "page");
    }
  }

  const closeNav = () => {
    if (!nav || !toggle) return;
    nav.dataset.open = "false";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Mở menu");
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove("nav-open");
  };

  const openNav = () => {
    if (!nav || !toggle) return;
    nav.dataset.open = "true";
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Đóng menu");
    if (backdrop) backdrop.hidden = false;
    document.body.classList.add("nav-open");
  };

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      if (nav.dataset.open === "true") closeNav();
      else openNav();
    });

    for (const link of nav.querySelectorAll("a")) link.addEventListener("click", closeNav);
    for (const button of document.querySelectorAll("[data-nav-close]")) {
      button.addEventListener("click", closeNav);
    }
    backdrop?.addEventListener("click", closeNav);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.dataset.open === "true") {
        closeNav();
        toggle.focus();
      }
    });
  }

  const user = auth.user();
  for (const accountLink of document.querySelectorAll("[data-account-link]")) {
    accountLink.textContent = user ? user.username : "Đăng nhập";
    accountLink.href = user ? "don-hang.html" : "dang-nhap.html";

    const next = accountLink.nextElementSibling;
    if (user && (!next || !next.matches("[data-logout]"))) {
      const logout = document.createElement("a");
      logout.href = "dang-nhap.html";
      logout.dataset.logout = "";
      logout.textContent = "Đăng xuất";
      accountLink.after(logout);
    } else if (!user && next?.matches("[data-logout]")) {
      next.remove();
    }
  }

  for (const logout of document.querySelectorAll("[data-logout]")) {
    logout.hidden = !user;
    if (logout.dataset.logoutBound === "true") continue;
    logout.dataset.logoutBound = "true";
    logout.addEventListener("click", (event) => {
      event.preventDefault();
      auth.clear();
      window.location.href = "dang-nhap.html";
    });
  }

  for (const icon of document.querySelectorAll("[data-account-icon]")) {
    icon.href = user ? "don-hang.html" : "dang-nhap.html";
    icon.setAttribute("aria-label", user ? `Tài khoản ${user.username}` : "Đăng nhập");
    icon.dataset.authenticated = user ? "true" : "false";
  }

  if (page === "dang-nhap.html" && !user) {
    document.querySelector("[data-account-link]")?.setAttribute("aria-current", "page");
  }

  renderCartCount();
};

export const setupPage = () => {
  renderShell();
  setupHeader();
  setupHeaderSearch();
  setupNewsletter();
};

import {
  api,
  categoryIcon,
  colorLabel,
  escapeHtml,
  money,
  renderProductList,
  setupPage,
} from "./common.js";

setupPage();

const PRIMARY_CATEGORIES = [
  "chuot",
  "ban-phim",
  "lot-chuot",
  "tai-nghe",
  "ghe",
  "phu-kien-cong-thai-hoc",
];

const HERO_COPY = {
  chuot: {
    kicker: "Chuột gaming",
    title: "Chuột nhẹ, phản hồi nhanh cho mọi trận đấu.",
    lead: "Chọn theo cỡ tay, trọng lượng và kiểu cầm. Cảm biến và kết nối được ghi rõ để bạn không phải đoán.",
  },
  "ban-phim": {
    kicker: "Bàn phím cơ & HE",
    title: "Bàn phím đúng layout, gõ đúng cảm giác.",
    lead: "Từ 65% gọn gàng đến TKL đủ phím. Switch, hành trình và rapid trigger đều có thông số cụ thể.",
  },
  "lot-chuot": {
    kicker: "Lót chuột",
    title: "Mặt lót mượt, kiểm soát chính xác từng pha.",
    lead: "Chọn theo kích thước, bề mặt và tốc độ di chuột để hợp với cảm giác chơi của bạn.",
  },
  "tai-nghe": {
    kicker: "Tai nghe gaming",
    title: "Nghe rõ hướng, thoải mái khi chơi lâu.",
    lead: "Tai nghe có dây, không dây và chống ồn. Chọn theo kiểu đeo, micro và nhu cầu sử dụng.",
  },
  ghe: {
    kicker: "Ghế công thái học",
    title: "Ngồi đúng tư thế, chơi đủ dài.",
    lead: "Lưng lưới, tựa đầu và tải trọng được ghi rõ. Thử trực tiếp tại showroom trước khi chọn.",
  },
  "phu-kien-cong-thai-hoc": {
    kicker: "Phụ kiện công thái học",
    title: "Những chi tiết nhỏ giúp góc máy gọn hơn.",
    lead: "Kê tay, arm màn hình và phụ kiện bàn làm việc giúp giảm mỏi và sắp xếp không gian.",
  },
};

const DEFAULT_HERO = {
  kicker: "Gear chính hãng",
  title: "Gear gọn, chuẩn gu cho góc máy chơi game.",
  lead: "Chuột, bàn phím, tai nghe và ghế được chọn theo thông số thật, bảo hành rõ ràng.",
};

const heroSlide = (product, index) => {
  const slug = product.category?.slug ?? "default";
  const copy = HERO_COPY[slug] ?? DEFAULT_HERO;
  const color = colorLabel(product.color);
  const categoryName = product.category?.name ?? "Gear Shop";
  const categoryHref = product.category?.slug
    ? `san-pham.html?slug=${encodeURIComponent(product.category.slug)}`
    : "san-pham.html";
  const chips = [
    categoryName,
    Number(product.rating) > 0 ? `${Number(product.rating).toFixed(1)}/5` : null,
    product.brand?.name ?? null,
    color?.label ?? null,
  ].filter(Boolean);

  return `
    <article class="hero-slide${index === 0 ? " is-active" : ""}" data-hero-slide aria-hidden="${index === 0 ? "false" : "true"}">
      <div class="hero-slide__copy">
        <p class="hero-slide__eyebrow">${escapeHtml(copy.kicker)}</p>
        <h2 class="hero-slide__title">${escapeHtml(copy.title)}</h2>
        <p class="hero-slide__lead">${escapeHtml(copy.lead)}</p>
        <p class="hero-slide__price"><span>Từ</span> ${money(product.price)}</p>
        <div class="hero-slide__actions">
          <a class="btn btn--primary" href="chi-tiet.html?id=${product.id}">Xem chi tiết</a>
          <a class="btn btn--ghost" href="${categoryHref}">Khám phá danh mục</a>
        </div>
        <ul class="hero-slide__chips">
          ${chips.map((chip) => `<li>${escapeHtml(chip)}</li>`).join("")}
        </ul>
      </div>
      <div class="hero-slide__visual" aria-hidden="true">
        <span class="hero-slide__glow"></span>
        <span class="hero-slide__icon">${categoryIcon(slug)}</span>
        <span class="hero-slide__ring hero-slide__ring--one"></span>
        <span class="hero-slide__ring hero-slide__ring--two"></span>
        <div class="hero-slide__float">
          <span>${escapeHtml(product.name)}</span>
          <strong>${money(product.price)}</strong>
        </div>
      </div>
    </article>`;
};

const setupHero = (items) => {
  const slidesRoot = document.querySelector("[data-hero-slides]");
  const controls = document.querySelector(".hero__controls");
  if (!slidesRoot || items.length === 0) return;

  const slides = items.slice(0, 3);
  slidesRoot.innerHTML = slides.map(heroSlide).join("");

  const dots = document.querySelector("[data-hero-dots]");
  if (dots) {
    dots.innerHTML = slides
      .map(
        (product, index) =>
          `<button class="hero__dot${index === 0 ? " is-active" : ""}" type="button"
             role="tab" aria-selected="${index === 0}" data-hero-dot="${index}"
             aria-label="Slide ${index + 1}: ${escapeHtml(product.name)}">${String(index + 1).padStart(2, "0")}</button>`,
      )
      .join("");
  }

  const slideElements = [...slidesRoot.querySelectorAll("[data-hero-slide]")];
  const dotElements = dots ? [...dots.querySelectorAll("[data-hero-dot]")] : [];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = document.querySelector("[data-hero]");
  const pauseButton = document.querySelector("[data-hero-pause]");
  let current = 0;
  let timer = null;
  let paused = false;

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const start = () => {
    stop();
    if (!paused && !reduceMotion && slideElements.length > 1) {
      timer = setInterval(() => show(current + 1), 6500);
    }
  };

  const show = (next) => {
    current = (next + slideElements.length) % slideElements.length;
    slideElements.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === current);
      slide.setAttribute("aria-hidden", String(index !== current));
    });
    dotElements.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === current);
      dot.setAttribute("aria-selected", String(index === current));
      dot.tabIndex = index === current ? 0 : -1;
    });
  };

  const go = (next) => {
    show(next);
    start();
  };

  if (slideElements.length <= 1 && controls) controls.hidden = true;

  document.querySelector("[data-hero-prev]")?.addEventListener("click", () => go(current - 1));
  document.querySelector("[data-hero-next]")?.addEventListener("click", () => go(current + 1));

  dots?.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-hero-dot]");
    if (!dot) return;
    go(Number(dot.dataset.heroDot));
  });

  dots?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = current + (event.key === "ArrowRight" ? 1 : -1);
    go(next);
    dotElements[(next + dotElements.length) % dotElements.length]?.focus();
  });

  const setPaused = (value) => {
    paused = value;
    pauseButton?.setAttribute("aria-pressed", String(value));
    pauseButton?.setAttribute(
      "aria-label",
      value ? "Tiếp tục tự động chuyển slide" : "Tạm dừng tự động chuyển slide",
    );
    if (value) stop();
    else start();
  };

  pauseButton?.addEventListener("click", () => setPaused(!paused));

  hero?.addEventListener("mouseenter", stop);
  hero?.addEventListener("mouseleave", () => {
    if (!paused) start();
  });
  hero?.addEventListener("focusin", stop);
  hero?.addEventListener("focusout", (event) => {
    if (!hero.contains(event.relatedTarget) && !paused) start();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (!paused) start();
  });

  show(0);
  start();
};

const loadCategories = async () => {
  const list = document.querySelector("[data-categories]");
  if (!list) return;

  try {
    const categories = await api.categories();
    const bySlug = new Map(categories.map((category) => [category.slug, category]));
    const ordered = PRIMARY_CATEGORIES.map((slug) => bySlug.get(slug)).filter(Boolean);

    list.innerHTML = ordered
      .map((category) => {
        const count = category._count?.products ?? 0;
        return `
          <li>
            <a class="category-card" href="san-pham.html?slug=${encodeURIComponent(category.slug)}">
              <span class="category-card__icon" aria-hidden="true">${categoryIcon(category.slug)}</span>
              <span class="category-card__name">${escapeHtml(category.name)}</span>
              <span class="category-card__count">${count > 0 ? `${count} sản phẩm` : "Sắp có"}</span>
            </a>
          </li>`;
      })
      .join("");
  } catch (error) {
    list.innerHTML = `<li class="category-grid__empty">${escapeHtml(error.message)}</li>`;
  }
};

const loadFeatured = async () => {
  const list = document.querySelector("[data-featured]");
  if (!list) return;

  try {
    const { items } = await api.featured(5);
    renderProductList(list, items.slice(0, 4));
    setupHero(items);
  } catch (error) {
    list.innerHTML = `<li class="product-grid__empty">${escapeHtml(error.message)}</li>`;
  }
};

const setupSmartForm = () => {
  const form = document.querySelector("[data-smart-form]");
  if (!form) return;

  const input = form.querySelector("input[name=q]");

  for (const tag of document.querySelectorAll("[data-smart-tag]")) {
    tag.addEventListener("click", () => {
      if (!input) return;
      input.value = tag.dataset.smartTag ?? "";
      input.focus();
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = new FormData(form).get("q")?.toString().trim() ?? "";
    if (!query) return;
    window.location.href = `san-pham.html?q=${encodeURIComponent(query)}&smart=1`;
  });
};

setupSmartForm();
loadCategories();
loadFeatured();

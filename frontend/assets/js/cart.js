import {
  api,
  auth,
  categoryIcon,
  escapeHtml,
  guestCart,
  money,
  PLACEHOLDER_IMAGE,
  resolveImage,
  setupPage,
  toast,
} from "./common.js";

setupPage();

const elements = {
  items: document.querySelector("[data-cart-items]"),
  message: document.querySelector("[data-cart-message]"),
  subtotal: document.querySelector("[data-subtotal]"),
  shippingRow: document.querySelector("[data-shipping-row]"),
  shippingFee: document.querySelector("[data-shipping-fee]"),
  total: document.querySelector("[data-total]"),
  form: document.querySelector("[data-checkout]"),
  formError: document.querySelector("[data-checkout-error]"),
  shippingSelect: document.querySelector("#shippingMethod"),
  guestNote: document.querySelector("[data-guest-note]"),
  address: document.querySelector("#shippingAddress"),
  phone: document.querySelector("#shippingPhone"),
  summary: document.querySelector(".summary"),
};

let shippingMethods = [];
let currentCart = null;

const normalizeLine = (item) => {
  const product = item.product ?? {};
  const price = Number(item.price ?? product.price ?? 0);
  const quantity = Number(item.quantity ?? 0);
  return {
    productId: item.productId ?? product.id,
    name: item.name ?? product.name ?? "",
    imageUrl: item.imageUrl ?? product.imageUrl ?? "",
    price,
    quantity,
    lineTotal: Number(item.lineTotal ?? price * quantity),
    stockQuantity: item.stockQuantity ?? product.stockQuantity ?? null,
    categorySlug: item.categorySlug ?? product.category?.slug ?? null,
  };
};

const emptyCartMarkup = `
  <div class="empty-state">
    <span class="empty-state__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    </span>
    <h2>Giỏ hàng đang trống</h2>
    <p>Thêm vài món gear phù hợp để bắt đầu. Giỏ của khách sẽ được đồng bộ khi bạn đăng nhập.</p>
    <a class="btn btn--primary" href="san-pham.html">Xem sản phẩm</a>
  </div>`;

const lineMarkup = ({ productId, name, imageUrl, price, quantity, lineTotal, categorySlug }) => `
  <article class="cart-line">
    <div class="cart-line__media">
      <span class="cart-line__art" aria-hidden="true">${categoryIcon(categorySlug)}</span>
      <img src="${escapeHtml(resolveImage(imageUrl))}" alt="${escapeHtml(name)}"
           width="112" height="112" loading="lazy"
           onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}'">
    </div>
    <div>
      <a class="cart-line__name" href="chi-tiet.html?id=${productId}">${escapeHtml(name)}</a>
      <p class="cart-line__meta">${money(price)} mỗi cái</p>
      <div class="cart-line__controls">
        <div class="qty">
          <button type="button" data-step="-1" data-product="${productId}" aria-label="Giảm số lượng">−</button>
          <output aria-live="polite">${quantity}</output>
          <button type="button" data-step="1" data-product="${productId}" aria-label="Tăng số lượng">+</button>
        </div>
        <button class="link-quiet" type="button" data-remove="${productId}">Xoá</button>
      </div>
    </div>
    <p class="cart-line__total">${money(lineTotal)}</p>
  </article>
`;

const updateTotals = (subtotal, fee = 0) => {
  elements.subtotal.textContent = money(subtotal);
  elements.total.textContent = money(subtotal + fee);
};

const renderShipping = (cart) => {
  const fee = Number(elements.shippingSelect.selectedOptions[0]?.dataset.fee ?? 0);
  elements.shippingRow.hidden = false;
  elements.shippingFee.textContent = money(fee);
  updateTotals(cart.subtotal, fee);
};

const renderGuestCart = () => {
  const items = guestCart.items().map(normalizeLine);

  elements.guestNote.hidden = false;
  elements.form.hidden = true;
  elements.shippingRow.hidden = true;
  elements.summary.hidden = items.length === 0;

  if (items.length === 0) {
    elements.items.innerHTML = emptyCartMarkup;
    elements.message.textContent = "";
    updateTotals(0);
    return;
  }

  elements.message.textContent = "";
  elements.items.innerHTML = items.map(lineMarkup).join("");
  updateTotals(guestCart.subtotal());
};

const renderServerCart = async () => {
  elements.guestNote.hidden = true;
  elements.form.hidden = false;

  const [cart, methods] = await Promise.all([api.cart(), api.shippingMethods()]);
  shippingMethods = methods.filter((method) => method.isActive);

  elements.shippingSelect.innerHTML = shippingMethods
    .map((method) => {
      const days = method.estimatedDays ? `, ${method.estimatedDays}` : "";
      return `<option value="${method.id}" data-fee="${method.fee}">${escapeHtml(
        method.name,
      )}, ${money(method.fee)}${escapeHtml(days)}</option>`;
    })
    .join("");

  if (cart.items.length === 0) {
    elements.items.innerHTML = emptyCartMarkup;
    elements.message.textContent = "";
    elements.form.hidden = true;
    elements.shippingRow.hidden = true;
    elements.summary.hidden = true;
    updateTotals(0);
    return;
  }

  elements.message.textContent = "";
  elements.items.innerHTML = cart.items.map((item) => lineMarkup(normalizeLine(item))).join("");
  elements.form.hidden = false;
  elements.summary.hidden = false;

  const user = auth.user();
  if (user?.address && !elements.address.value) elements.address.value = user.address;

  currentCart = cart;
  renderShipping(cart);
};

elements.shippingSelect.addEventListener("change", () => {
  if (currentCart) renderShipping(currentCart);
});

const reload = async () => {
  try {
    if (auth.isLoggedIn()) await renderServerCart();
    else renderGuestCart();
  } catch (error) {
    elements.items.innerHTML = "";
    elements.message.textContent = error.message;
    elements.form.hidden = true;
    elements.summary.hidden = true;
  }
};

elements.items.addEventListener("click", async (event) => {
  const stepButton = event.target.closest("[data-step]");
  const removeButton = event.target.closest("[data-remove]");

  if (stepButton) {
    const productId = Number(stepButton.dataset.product);
    const step = Number(stepButton.dataset.step);

    if (auth.isLoggedIn()) {
      const cart = await api.cart();
      const line = cart.items.find((item) => item.productId === productId);
      if (!line) return;
      try {
        await api.updateCartItem(productId, line.quantity + step);
      } catch (error) {
        toast(error.message);
      }
    } else {
      const line = guestCart.items().find((item) => item.productId === productId);
      guestCart.setQuantity(productId, Math.max(0, (line?.quantity ?? 1) + step));
    }
    await reload();
    return;
  }

  if (removeButton) {
    const productId = Number(removeButton.dataset.remove);
    if (auth.isLoggedIn()) {
      try {
        await api.removeCartItem(productId);
      } catch (error) {
        toast(error.message);
      }
    } else {
      guestCart.remove(productId);
    }
    await reload();
  }
});

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = elements.form.querySelector("button[type=submit]");
  const data = new FormData(elements.form);
  elements.formError.hidden = true;
  button.disabled = true;

  try {
    const order = await api.checkout({
      shippingMethodId: Number(data.get("shippingMethodId")),
      shippingAddress: data.get("shippingAddress")?.toString().trim(),
      shippingPhone: data.get("shippingPhone")?.toString().trim(),
    });
    sessionStorage.setItem("gear_last_order", String(order.id));
    toast(`Đã đặt đơn #${order.id}.`);
    window.location.href = "don-hang.html";
  } catch (error) {
    elements.formError.hidden = false;
    elements.formError.textContent = error.message;
    button.disabled = false;
  }
});

reload();

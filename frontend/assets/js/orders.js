import {
  api,
  auth,
  dateTime,
  escapeHtml,
  money,
  ORDER_STATUS_LABELS,
  PLACEHOLDER_IMAGE,
  resolveImage,
  setupPage,
  toast,
} from "./common.js";

setupPage();

const container = document.querySelector("[data-orders]");
const message = document.querySelector("[data-message]");
const accountName = document.querySelector("[data-account-name]");
const accountEmail = document.querySelector("[data-account-email]");
const accountAvatar = document.querySelector("[data-account-avatar]");

const user = auth.user();
if (user) {
  if (accountName) accountName.textContent = user.username;
  if (accountEmail) accountEmail.textContent = user.email ?? "";
  if (accountAvatar) accountAvatar.textContent = user.username.slice(0, 2).toUpperCase();
}

const emptyState = ({ title, text, href, cta }) => `
  <div class="empty-state">
    <span class="empty-state__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    </span>
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(text)}</p>
    <a class="btn btn--primary" href="${href}">${escapeHtml(cta)}</a>
  </div>`;

const orderMarkup = (order) => {
  const items = order.items
    .map((item) => {
      const product = item.product ?? {};
      return `
        <li class="order-item">
          <img class="order-item__img" src="${escapeHtml(resolveImage(product.imageUrl))}" alt=""
               width="48" height="48" loading="lazy"
               onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}'">
          <span class="order-item__name">${escapeHtml(product.name ?? "Sản phẩm")} × ${item.quantity}</span>
          <span class="order-item__price">${money(Number(item.price) * item.quantity)}</span>
        </li>
      `;
    })
    .join("");

  const canCancel = order.status === "pending";
  const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;

  return `
    <article class="order">
      <div class="order__head">
        <h2 class="order__id">Đơn #${order.id}</h2>
        <p class="order__status order__status--${escapeHtml(order.status)}">${escapeHtml(statusLabel)}</p>
        <p class="order__date">${dateTime(order.createdAt)}</p>
      </div>
      <ul class="order__items">${items}</ul>
      <div class="order__foot">
        <span class="order__meta">${escapeHtml(order.shippingMethod?.name ?? "")}</span>
        <span class="order__meta">${escapeHtml(order.shippingAddress)}</span>
        ${
          canCancel
            ? `<button class="link-quiet" type="button" data-cancel="${order.id}">Huỷ đơn</button>`
            : ""
        }
        <span class="order__total">Tổng ${money(order.totalAmount)}</span>
      </div>
    </article>
  `;
};

const load = async () => {
  if (!auth.isLoggedIn()) {
    container.innerHTML = emptyState({
      title: "Đăng nhập để xem đơn hàng",
      text: "Đơn hàng của bạn sẽ được lưu và theo dõi trong tài khoản Gear Shop.",
      href: "dang-nhap.html?next=don-hang.html",
      cta: "Đăng nhập",
    });
    message.textContent = "";
    return;
  }

  try {
    const data = await api.orders({ limit: 20 });
    if (data.items.length === 0) {
      message.textContent = "";
      container.innerHTML = emptyState({
        title: "Chưa có đơn hàng nào",
        text: "Khi bạn đặt gear, đơn hàng sẽ xuất hiện ở đây để theo dõi trạng thái.",
        href: "san-pham.html",
        cta: "Xem sản phẩm",
      });
      return;
    }
    message.textContent = "";
    container.innerHTML = data.items.map(orderMarkup).join("");
  } catch (error) {
    message.textContent = error.message;
    container.innerHTML = "";
  }
};

container.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-cancel]");
  if (!button) return;

  button.disabled = true;
  try {
    await api.cancelOrder(Number(button.dataset.cancel));
    toast("Đã huỷ đơn hàng.");
    await load();
  } catch (error) {
    toast(error.message);
    button.disabled = false;
  }
});

load();

import { api, auth, setupPage, syncGuestCart, toast } from "./common.js";

setupPage();

const loginForm = document.querySelector("[data-login-form]");
const registerForm = document.querySelector("[data-register-form]");
const loginError = document.querySelector("[data-error]");
const registerError = document.querySelector("[data-register-error]");
const switchButton = document.querySelector("[data-switch]");
const switchText = document.querySelector("[data-switch-text]");
const heading = document.querySelector("[data-heading]");

const nextTarget = () => {
  const requested = new URLSearchParams(window.location.search).get("next");
  if (!requested) return "don-hang.html";
  // Chỉ nhận đường dẫn nội bộ để tránh chuyển hướng ra ngoài.
  return /^[a-z0-9-]+\.html(\?.*)?$/i.test(requested) ? requested : "don-hang.html";
};

const finish = async ({ user, token }) => {
  auth.save({ user, token });
  await syncGuestCart();
  toast(`Xin chào ${user.username}.`);
  window.location.href = nextTarget();
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  const data = new FormData(loginForm);
  const button = loginForm.querySelector("button[type=submit]");
  button.disabled = true;

  try {
    const session = await api.login(
      data.get("account")?.toString().trim(),
      data.get("password")?.toString(),
    );
    await finish(session);
  } catch (error) {
    loginError.hidden = false;
    loginError.textContent = error.message;
    button.disabled = false;
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerError.hidden = true;
  const data = new FormData(registerForm);
  const button = registerForm.querySelector("button[type=submit]");
  button.disabled = true;

  try {
    const session = await api.register({
      username: data.get("username")?.toString().trim(),
      email: data.get("email")?.toString().trim(),
      password: data.get("password")?.toString(),
      address: data.get("address")?.toString().trim() || undefined,
    });
    await finish(session);
  } catch (error) {
    registerError.hidden = false;
    registerError.textContent = error.message;
    button.disabled = false;
  }
});

switchButton.addEventListener("click", () => {
  const showingRegister = loginForm.hidden;
  loginForm.hidden = !showingRegister;
  registerForm.hidden = showingRegister;
  heading.textContent = showingRegister ? "Đăng nhập" : "Tạo tài khoản";
  switchText.textContent = showingRegister ? "Chưa có tài khoản?" : "Đã có tài khoản?";
  switchButton.textContent = showingRegister ? "Đăng ký" : "Đăng nhập";
  switchButton.setAttribute("aria-pressed", String(!showingRegister));
});

if (auth.isLoggedIn()) {
  window.location.href = nextTarget();
}

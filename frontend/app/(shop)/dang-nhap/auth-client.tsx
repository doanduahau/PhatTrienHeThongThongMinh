"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/components/store";
import { Button, Container } from "@/components/ui";

/** Chỉ nhận đường dẫn nội bộ để tránh chuyển hướng ra ngoài. */
const safeNext = (requested: string | null) =>
  requested && /^\/[a-z0-9\-/]*(\?.*)?$/i.test(requested) ? requested : "/don-hang";

function AuthForms() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, ready, login, toast } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = safeNext(searchParams.get("next"));

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, router, next]);

  const finish = async (session: Awaited<ReturnType<typeof api.login>>) => {
    await login(session);
    toast(`Xin chào ${session.user.username}.`);
    router.push(next);
    router.refresh();
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setBusy(true);
    try {
      const session = await api.login(
        data.get("account")?.toString().trim() ?? "",
        data.get("password")?.toString() ?? "",
      );
      await finish(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
      setBusy(false);
    }
  };

  const submitRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setBusy(true);
    try {
      const session = await api.register({
        username: data.get("username")?.toString().trim() ?? "",
        email: data.get("email")?.toString().trim() ?? "",
        password: data.get("password")?.toString() ?? "",
        address: data.get("address")?.toString().trim() || undefined,
      });
      await finish(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại.");
      setBusy(false);
    }
  };

  const field =
    "h-11 w-full rounded-btn border border-line px-3 text-sm";
  const label = "mb-1 block text-sm font-medium";

  return (
    <Container className="py-12">
      <div className="mx-auto grid max-w-4xl overflow-hidden rounded-card border border-line lg:grid-cols-2">
        <aside className="hidden flex-col justify-between gap-8 bg-ink p-8 text-bg lg:flex">
          <p className="text-lg font-bold">Gear Shop</p>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold">Một tài khoản cho mọi đơn gear.</h2>
            <p className="text-sm text-bg/70">
              Theo dõi đơn hàng, lưu địa chỉ giao hàng và đồng bộ giỏ giữa các thiết bị.
            </p>
            <ul className="space-y-2 text-sm text-bg/80">
              <li>Đặt hàng nhanh với địa chỉ đã lưu</li>
              <li>Theo dõi trạng thái đơn hàng</li>
              <li>Đồng bộ giỏ hàng giữa các thiết bị</li>
            </ul>
          </div>
          <p className="text-xs text-bg/50">Tài khoản demo: khachhang1 / 123456</p>
        </aside>

        <div className="p-8">
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </h1>

          {mode === "login" ? (
            <form onSubmit={submitLogin} className="mt-6 space-y-4">
              <div>
                <label htmlFor="account" className={label}>Tên đăng nhập hoặc email</label>
                <input id="account" name="account" type="text" autoComplete="username" required className={field} />
              </div>
              <div>
                <label htmlFor="password" className={label}>Mật khẩu</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required className={field} />
              </div>
              <Button type="submit" size="lg" disabled={busy} className="w-full">
                {busy ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </form>
          ) : (
            <form onSubmit={submitRegister} className="mt-6 space-y-4">
              <div>
                <label htmlFor="reg-username" className={label}>Tên đăng nhập</label>
                <input id="reg-username" name="username" type="text" autoComplete="username" required className={field} />
              </div>
              <div>
                <label htmlFor="reg-email" className={label}>Email</label>
                <input id="reg-email" name="email" type="email" autoComplete="email" required className={field} />
              </div>
              <div>
                <label htmlFor="reg-password" className={label}>Mật khẩu</label>
                <input id="reg-password" name="password" type="password" autoComplete="new-password" required className={field} />
              </div>
              <div>
                <label htmlFor="reg-address" className={label}>Địa chỉ (không bắt buộc)</label>
                <input id="reg-address" name="address" type="text" autoComplete="street-address" className={field} />
              </div>
              <Button type="submit" size="lg" disabled={busy} className="w-full">
                {busy ? "Đang tạo..." : "Tạo tài khoản"}
              </Button>
            </form>
          )}

          {error ? (
            <p role="alert" className="mt-3 text-sm text-danger">{error}</p>
          ) : null}

          <p className="mt-5 text-sm text-muted">
            {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
              className="font-medium text-accent hover:underline"
            >
              {mode === "login" ? "Đăng ký" : "Đăng nhập"}
            </button>
          </p>
          <p className="mt-4 text-xs text-muted lg:hidden">
            Tài khoản demo: <strong>khachhang1</strong> / <strong>123456</strong>.
          </p>
          <Link href="/san-pham" className="mt-4 inline-block text-sm text-muted hover:text-accent">
            Tiếp tục xem sản phẩm
          </Link>
        </div>
      </div>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Container className="py-12 text-muted">Đang tải...</Container>}>
      <AuthForms />
    </Suspense>
  );
}

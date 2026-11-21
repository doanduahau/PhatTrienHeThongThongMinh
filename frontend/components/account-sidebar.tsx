"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/components/store";

export function AccountSidebar() {
  const { user, logout } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/thong-tin-ca-nhan", label: "Thông tin cá nhân" },
    { href: "/don-hang", label: "Đơn hàng của tôi" },
    { href: "/gio-hang", label: "Giỏ hàng" },
  ];

  const handleLogout = async () => {
    if (!await logout()) return;
    router.push("/dang-nhap");
    router.refresh();
  };

  return (
    <aside aria-label="Tài khoản" className="h-fit space-y-1 rounded-card border border-line p-4 lg:sticky lg:top-24">
      <div className="mb-3 flex items-center gap-3 border-b border-line pb-4">
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent"
        >
          {user ? user.username.slice(0, 2).toUpperCase() : "GS"}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{user?.username ?? "Khách"}</p>
          <p className="truncate text-xs text-muted">{user?.email ?? "Chưa đăng nhập"}</p>
        </div>
      </div>
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`block rounded-btn px-3 py-2 text-sm ${
              isActive
                ? "bg-accent-soft font-medium text-accent"
                : "hover:bg-subtle"
            }`}
          >
            {link.label}
          </Link>
        );
      })}

      <div className="pt-2">
        <button
          type="button"
          onClick={handleLogout}
          className="block w-full rounded-btn px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft transition-colors"
        >
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

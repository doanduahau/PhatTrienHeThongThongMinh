"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/store";
import { Button, Container, EmptyState } from "@/components/ui";
import { AccountSidebar } from "@/components/account-sidebar";
import { api, ApiError } from "@/lib/api";

export default function ProfileClient() {
  const { user, ready, toast } = useStore();
  const router = useRouter();

  // State cập nhật thông tin
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // State đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email || "");
      setAddress(user.address || "");
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);

    try {
      await api.updateProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        address: address.trim(),
      });
      setProfileMsg({ type: "success", text: "Cập nhật thông tin thành công!" });
      toast("Đã lưu thông tin tài khoản.");
    } catch (err) {
      setProfileMsg({
        type: "error",
        text: err instanceof ApiError ? err.message : "Cập nhật thông tin thất bại.",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword.length < 6) {
      setPwdMsg({ type: "error", text: "Mật khẩu mới phải có ít nhất 6 ký tự!" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: "error", text: "Mật khẩu xác nhận không khớp!" });
      return;
    }

    setPwdLoading(true);

    try {
      await api.changePassword({ currentPassword, newPassword });
      setPwdMsg({ type: "success", text: "Đổi mật khẩu thành công!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast("Đổi mật khẩu thành công.");
    } catch (err) {
      setPwdMsg({
        type: "error",
        text: err instanceof ApiError ? err.message : "Đổi mật khẩu thất bại.",
      });
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <Container className="grid items-start gap-10 py-16 lg:py-20 lg:grid-cols-[260px_1fr]">
      <AccountSidebar />

      {/* Nội dung thông tin cá nhân */}
      <section aria-labelledby="profile-heading" className="space-y-8">
        {!ready ? (
          <p className="text-muted">Đang tải...</p>
        ) : !user ? (
          <EmptyState
            title="Đăng nhập để xem thông tin"
            text="Bạn cần đăng nhập để quản lý thông tin tài khoản và đổi mật khẩu."
            href="/dang-nhap?next=/thong-tin-ca-nhan"
            cta="Đăng nhập"
          />
        ) : (
          <div className="grid items-stretch gap-8 lg:grid-cols-2">
            {/* Form Thông tin tài khoản */}
            <div className="flex flex-col justify-between rounded-card border border-line p-6">
              <div>
                <h2 id="profile-heading" className="mb-4 text-xl font-semibold">
                  Thông tin tài khoản
                </h2>

                {profileMsg ? (
                  <div
                    role="alert"
                    className={`mb-4 rounded-btn p-3 text-sm ${
                      profileMsg.type === "success"
                        ? "bg-accent-soft text-accent"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {profileMsg.text}
                  </div>
                ) : null}

                <form id="profile-form" onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium mb-1">
                      Họ và tên
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      placeholder="Nhập họ và tên..."
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-btn border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-1">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-btn border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium mb-1">
                      Địa chỉ giao hàng mặc định
                    </label>
                    <textarea
                      id="address"
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
                      className="w-full rounded-btn border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>
                </form>
              </div>

              <div className="pt-4">
                <Button form="profile-form" type="submit" disabled={profileLoading} className="w-full sm:w-auto">
                  {profileLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </div>

            {/* Form Đổi mật khẩu */}
            <div className="flex flex-col justify-between rounded-card border border-line p-6">
              <div>
                <h2 className="mb-4 text-xl font-semibold">Đổi mật khẩu</h2>

                {pwdMsg ? (
                  <div
                    role="alert"
                    className={`mb-4 rounded-btn p-3 text-sm ${
                      pwdMsg.type === "success"
                        ? "bg-accent-soft text-accent"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {pwdMsg.text}
                  </div>
                ) : null}

                <form id="pwd-form" onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium mb-1">
                      Mật khẩu hiện tại
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-btn border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
                      Mật khẩu mới
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-btn border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-muted">Tối thiểu 6 ký tự.</p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-btn border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>
                </form>
              </div>

              <div className="pt-4">
                <Button form="pwd-form" type="submit" disabled={pwdLoading} className="w-full sm:w-auto">
                  {pwdLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </Container>
  );
}

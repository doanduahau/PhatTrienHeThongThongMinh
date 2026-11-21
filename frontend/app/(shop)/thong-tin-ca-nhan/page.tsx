import type { Metadata } from "next";
import ProfileClient from "./profile-client";

export const metadata: Metadata = {
  title: "Thông tin cá nhân | Gear Shop",
  description: "Quản lý thông tin tài khoản và đổi mật khẩu tại Gear Shop.",
};

export default function ProfilePage() {
  return <ProfileClient />;
}

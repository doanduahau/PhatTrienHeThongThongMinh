import type { Metadata } from "next";
import AuthClient from "./auth-client";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return <AuthClient />;
}

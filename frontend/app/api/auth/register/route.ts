import { NextResponse } from "next/server";
import { beFetch, COOKIE_NAME, cookieOptions, publicUser } from "@/lib/server-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { res, payload } = await beFetch("auth/register", { method: "POST", body });
  if (!res.ok) {
    return NextResponse.json(
      { message: payload.message || "Đăng ký thất bại." },
      { status: res.status },
    );
  }
  const { user, token } = payload.data ?? {};
  const out = NextResponse.json({ user: publicUser(user) });
  out.cookies.set(COOKIE_NAME, token, cookieOptions);
  return out;
}

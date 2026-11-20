import { NextResponse, type NextRequest } from "next/server";
import { beFetch, clearCookie, COOKIE_NAME, publicUser } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
  }
  const { res, payload } = await beFetch("auth/me", { token });
  if (!res.ok) {
    const out = NextResponse.json(
      { message: payload.message || "Phiên đăng nhập hết hạn." },
      { status: res.status },
    );
    return res.status === 401 ? clearCookie(out) : out;
  }
  return NextResponse.json(publicUser(payload.data));
}

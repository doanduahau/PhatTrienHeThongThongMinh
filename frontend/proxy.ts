import { NextResponse, type NextRequest } from "next/server";

/**
 * /admin chỉ tồn tại với admin. Người khác phải nhận đúng trang 404 của một URL
 * rác: chặn ở đây là lần duy nhất kịp, vì metadata (title "… · Quản trị") được
 * tính từ cây route trước khi component nào đó kịp từ chối.
 * Role đọc từ payload JWT mà không xác minh chữ ký — đây là lớp UX, tường thật
 * vẫn là requireAdmin + AdminGate gọi auth/me.
 */
function roleOf(token: string | undefined) {
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json?.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

export default function proxy(req: NextRequest) {
  if (roleOf(req.cookies.get("gear_token")?.value) === "admin") return NextResponse.next();
  return NextResponse.rewrite(new URL("/khong-tim-thay", req.url));
}

export const config = { matcher: ["/admin", "/admin/:path*"] };

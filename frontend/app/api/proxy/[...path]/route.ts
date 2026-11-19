import { NextResponse, type NextRequest } from "next/server";
import { beFetch, COOKIE_NAME } from "@/lib/server-auth";

/**
 * Proxy cho các endpoint cần đăng nhập (cart, orders, for-you, ratings…).
 * Đọc JWT từ cookie httpOnly rồi gắn Bearer khi gọi business service —
 * client không bao giờ đọc được token (§5.0).
 */
async function handle(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
  }
  const { path } = await params;
  const query = new URL(request.url).search;
  const method = request.method;
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.json().catch(() => undefined);
  const { res, payload } = await beFetch(path.join("/"), {
    method,
    body,
    token,
    query,
  });
  return NextResponse.json(payload, { status: res.status });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

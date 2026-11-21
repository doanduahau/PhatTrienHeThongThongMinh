import { NextResponse, type NextRequest } from "next/server";
import { BE_BASE, COOKIE_NAME } from "@/lib/server-auth";

const MAX_BYTES = 10 * 1024 * 1024;

async function handle(
  request: NextRequest,
  { params }: { params: Promise<{ scope: string; name: string }> },
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
  }
  const { scope, name } = await params;
  if ((scope !== "original" && scope !== "uploaded") || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}\.csv$/i.test(name)) {
    return NextResponse.json({ message: "Tên tệp CSV hoặc nguồn dữ liệu không hợp lệ." }, { status: 400 });
  }
  if (request.method !== "GET" && scope !== "uploaded") {
    return NextResponse.json({ message: "Chỉ chỉnh sửa được tệp đã tải lên." }, { status: 405 });
  }

  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const options: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    cache: "no-store",
  };
  if (request.method === "PUT") {
    if (Number(request.headers.get("content-length")) > MAX_BYTES) {
      return NextResponse.json({ message: "Tệp CSV tối đa 10 MB." }, { status: 413 });
    }
    if (request.headers.get("content-type") !== "application/octet-stream" || !request.body) {
      return NextResponse.json({ message: "Chọn một tệp CSV có dữ liệu." }, { status: 415 });
    }
    headers.set("Content-Type", "application/octet-stream");
    options.body = request.body;
    options.duplex = "half";
  }

  try {
    const upstream = await fetch(`${BE_BASE}/api/admin/ml/datasets/${scope}/${encodeURIComponent(name)}`, options);
    const responseHeaders = new Headers({ "Cache-Control": "private, no-store" });
    for (const key of ["Content-Type", "Content-Disposition"]) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ message: "Không kết nối được business service." }, { status: 503 });
  }
}

export const GET = handle;
export const PUT = handle;
export const DELETE = handle;

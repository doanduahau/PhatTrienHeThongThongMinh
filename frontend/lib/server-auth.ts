import { NextResponse } from "next/server";

/** Business service URL (server-side proxy gọi tới đây). */
export const BE_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
export const COOKIE_NAME = "gear_token";

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
};

/** Gọi business service, giữ nguyên HTTP status + payload để route trả về client. */
export async function beFetch(
  path: string,
  {
    method = "GET",
    body,
    token,
    query = "",
  }: { method?: string; body?: unknown; token?: string; query?: string } = {},
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BE_BASE}/api/${path}${query}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return {
      res: { ok: false, status: 503 } as Response,
      payload: { message: "Không kết nối được business service. Kiểm tra backend đang chạy." },
    };
  }
  const payload = await res.json().catch(() => ({}));
  return { res, payload };
}

export const clearCookie = (response: NextResponse) => {
  response.cookies.set(COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 });
  return response;
};

/** Chỉ trả các trường an toàn cho client — loại hash token/reset/verify nhạy cảm. */
export function publicUser(user: Record<string, unknown> | null | undefined) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    address: user.address ?? null,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}

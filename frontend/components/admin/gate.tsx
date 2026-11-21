import { cookies } from "next/headers";
import { beFetch, COOKIE_NAME } from "@/lib/server-auth";
import { NotFound } from "@/components/not-found";

const PAGE_404 = (
  <NotFound
    title="Ối! Trang này không tồn tại"
    lead="Trang bạn tìm không có hoặc đã bị gỡ."
  />
);

/**
 * Chặn /admin phía server: sai vai trò hay hết token đều chỉ thấy trang 404.
 * Không ném notFound() — lỗi ném trong lúc prerender bị bake vào shell tĩnh
 * và không chạy lại theo request, nên trang thật của admin không bao giờ tới.
 */
export async function AdminGate({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const { res, payload } = token
    ? await beFetch("auth/me", { token })
    : { res: { ok: false }, payload: {} };
  const role = (payload as { data?: { role?: string } }).data?.role;

  if (!res.ok || role !== "admin") return PAGE_404;

  return <>{children}</>;
}

import { ButtonLink, Container } from "./ui";

/** Trang 404 một cột: số lỗi, tiêu đề, mô tả và hai nút chuyển hướng, căn giữa màn hình. */
export function NotFound({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] w-full items-center justify-center py-16">
      <Container>
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="text-display font-bold tabular-nums text-ink">404</p>
          <h1 className="mt-6 text-h1 font-bold">{title}</h1>
          <p className="mt-4 max-w-2xl text-lead text-muted">{lead}</p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/" size="lg">
              Về trang chủ
            </ButtonLink>
            <ButtonLink href="/san-pham" variant="ghost" size="lg">
              Xem tất cả sản phẩm
            </ButtonLink>
          </div>
        </div>
      </Container>
    </div>
  );
}

import type { Metadata } from "next";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Đổi trả & bảo hành" };

export default function ReturnsPage() {
  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-3xl font-bold text-ink">Đổi trả & bảo hành</h1>
      <div className="mt-6 space-y-4 text-ink/80">
        <p>
          <strong>Đổi trả trong 7 ngày</strong> với sản phẩm còn nguyên tem,
          phụ kiện và hộp. Sản phẩm lỗi do nhà sản xuất được đổi mới miễn phí.
        </p>
        <p>
          <strong>Bảo hành chính hãng</strong> theo từng sản phẩm (thường 1–2
          năm với thiết bị gaming). Thời gian bảo hành ghi chi tiết ở trang sản
          phẩm.
        </p>
        <p>
          Khi cần đổi trả, mở đơn trong mục <em>Đơn hàng</em> hoặc liên hệ qua
          trang <em>Liên hệ</em> kèm mã đơn và mô tả lỗi.
        </p>
        <p className="text-sm text-muted">
          (Nội dung tạm thời — cập nhật chính sách thực tế của cửa hàng tại
          file này.)
        </p>
      </div>
    </Container>
  );
}

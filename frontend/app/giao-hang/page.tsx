import type { Metadata } from "next";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Giao hàng" };

export default function ShippingPage() {
  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-3xl font-bold text-ink">Giao hàng</h1>
      <div className="mt-6 space-y-4 text-ink/80">
        <p>
          <strong>Giao nhanh 0–3 ngày</strong> toàn quốc. Đơn trước 15h được xử
          lý trong ngày làm việc.
        </p>
        <p>
          <strong>Miễn phí ship</strong> cho đơn từ 1.000.000đ. Các đơn còn lại
          tính phí theo bảng giá của hãng vận chuyển.
        </p>
        <p>
          Sau khi đóng gói, bạn nhận được mã vận đơn qua email và có thể theo
          dõi trạng thái trong mục <em>Đơn hàng</em>.
        </p>
        <p className="text-sm text-muted">
          (Nội dung tạm thời — cập nhật chính sách thực tế của cửa hàng tại
          file này.)
        </p>
      </div>
    </Container>
  );
}

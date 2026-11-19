import Link from "next/link";
import { Container } from "./ui";

export function Footer() {
  return (
    <footer className="mt-14 bg-footer text-footer-text">
      <Container className="grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="text-lg font-bold">Gear Shop</p>
          <p className="text-sm text-footer-text/70">
            Gear chính hãng cho góc máy chơi game. Chọn theo thông số thật, bảo
            hành rõ ràng.
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <h3 className="font-semibold">Liên hệ & hỗ trợ</h3>
          <p>
            <span className="block text-footer-text/60">Tư vấn mua hàng</span>
            <a href="tel:0904135321" className="hover:underline">0904.135.321</a>
          </p>
          <p>
            <span className="block text-footer-text/60">Bảo hành & kỹ thuật</span>
            <a href="tel:0899454393" className="hover:underline">0899.454.393</a>
          </p>
          <p>
            <span className="block text-footer-text/60">Email</span>
            <a href="mailto:hello@gearshop.vn" className="hover:underline">
              hello@gearshop.vn
            </a>
          </p>
          <p>
            <span className="block text-footer-text/60">Showroom</span>
            89 Hồ Văn Huê, TP.HCM · 8:30 – 20:00
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <h3 className="font-semibold">Mua sắm</h3>
          <Link href="/san-pham" className="block hover:underline">Tất cả sản phẩm</Link>
          <Link href="/san-pham?sort=price_asc" className="block hover:underline">Gear giá tốt</Link>
          <Link href="/san-pham?sort=rating_desc" className="block hover:underline">Gear đánh giá cao</Link>
        </div>
        <div className="space-y-3 text-sm">
          <h3 className="font-semibold">Tài khoản</h3>
          <Link href="/gio-hang" className="block hover:underline">Giỏ hàng</Link>
          <Link href="/don-hang" className="block hover:underline">Đơn hàng</Link>
          <Link href="/dang-nhap" className="block hover:underline">Đăng nhập</Link>
        </div>
      </Container>
      <div className="border-t border-footer-text/10">
        <Container className="flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-footer-text/60">
          <span>© 2026 Gear Shop. All rights reserved.</span>
          <span>Thiết kế lấy cảm hứng từ Phong Cách Xanh.</span>
        </Container>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { Container } from "./ui";

function ContactContent() {
  return (
    <div className="space-y-3 text-sm">
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
        <a href="mailto:n23dccn009@student.ptithcm.edu.vn" className="block hover:underline">
          n23dccn009@student.ptithcm.edu.vn
        </a>
        <a href="mailto:n23dccn010@student.ptithcm.edu.vn" className="block hover:underline">
          n23dccn010@student.ptithcm.edu.vn
        </a>
      </p>
      <p>
        <span className="block text-footer-text/60">Showroom</span>
        778/B1 Nguyễn Kiệm, Phú Nhuận, TP.HCM
        <span className="block">273 Nguyễn Văn Lượng, Gò Vấp, TP.HCM</span>
        <span className="block text-footer-text/60">8:30 – 20:00</span>
      </p>
    </div>
  );
}

function ShopContent() {
  return (
    <div className="space-y-3 text-sm">
      <Link href="/san-pham" className="block hover:underline">Tất cả sản phẩm</Link>
      <Link href="/san-pham?sort=price_asc" className="block hover:underline">Gear giá tốt</Link>
      <Link href="/san-pham?sort=rating_desc" className="block hover:underline">Gear đánh giá cao</Link>
    </div>
  );
}

function AccountContent() {
  return (
    <div className="space-y-3 text-sm">
      <Link href="/gio-hang" className="block hover:underline">Giỏ hàng</Link>
      <Link href="/don-hang" className="block hover:underline">Đơn hàng</Link>
      <Link href="/dang-nhap" className="block hover:underline">Đăng nhập</Link>
    </div>
  );
}

function Brand() {
  return (
    <div className="space-y-3">
      <p className="text-lg font-bold">Gear Shop</p>
      <p className="text-sm text-footer-text/70">
        Gear chính hãng cho góc máy chơi game. Chọn theo thông số thật, bảo
        hành rõ ràng.
      </p>
    </div>
  );
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-t border-footer-text/10 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4 transition-transform group-open:rotate-180" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function Footer() {
  return (
    <footer className="bg-footer text-footer-text">
      {/* Desktop: lưới cột tĩnh */}
      <Container className="hidden gap-10 py-12 md:grid md:grid-cols-2 lg:grid-cols-4">
        <Brand />
        <div className="space-y-3">
          <h3 className="font-semibold">Liên hệ & hỗ trợ</h3>
          <ContactContent />
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold">Mua sắm</h3>
          <ShopContent />
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold">Tài khoản</h3>
          <AccountContent />
        </div>
      </Container>

      {/* Mobile: accordion (§5.1.9) — details/summary native, không tốn JS */}
      <Container className="py-8 md:hidden">
        <Brand />
        <div className="mt-4">
          <Accordion title="Liên hệ & hỗ trợ"><ContactContent /></Accordion>
          <Accordion title="Mua sắm"><ShopContent /></Accordion>
          <Accordion title="Tài khoản"><AccountContent /></Accordion>
        </div>
      </Container>

      <div className="border-t border-footer-text/10">
        <Container className="flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-footer-text/60">
          <span>© 2026 Gear Shop.</span>
        </Container>
      </div>
    </footer>
  );
}

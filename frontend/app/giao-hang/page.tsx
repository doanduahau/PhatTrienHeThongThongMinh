import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Chính sách giao hàng",
  description: "Thông tin thời gian giao hàng, biểu phí vận chuyển và quy trình nhận hàng tại Gear Shop.",
};

const SHIPPING_METHODS = [
  {
    title: "Giao tiêu chuẩn (Toàn quốc)",
    time: "2 – 4 ngày làm việc",
    fee: "Đồng giá 30.000đ (Miễn phí từ 1.000.000đ)",
    desc: "Vận chuyển qua Viettel Post / GHTK / GHN đến tận tay quý khách trên 63 tỉnh thành.",
  },
  {
    title: "Giao nhanh nội thành (TP.HCM & Hà Nội)",
    time: "24 – 48 giờ",
    fee: "25.000đ – 35.000đ tuỳ khu vực",
    desc: "Ưu tiên điều phối kho nội thành gần nhất, cam kết giao đúng khung giờ hẹn.",
  },
  {
    title: "Giao hoả tốc (GrabExpress / Ahamove)",
    time: "1 – 2 giờ kể từ khi xác nhận đơn",
    fee: "Theo biểu phí ứng dụng vận chuyển",
    desc: "Áp dụng cho khách hàng nội thành TP.HCM cần nhận gear gấp trong ngày.",
  },
];

const SHIPPING_FAQS = [
  {
    q: "Khi nào đơn hàng của tôi được đóng gói gửi đi?",
    a: "Các đơn hàng đặt trước 15:00 từ Thứ 2 đến Thứ 7 sẽ được xử lý đóng gói và bàn giao cho đơn vị vận chuyển ngay trong ngày. Đơn đặt sau 15:00 hoặc ngày Chủ nhật/ngày lễ sẽ được gửi vào sáng ngày làm việc kế tiếp.",
  },
  {
    q: "Tôi có được đồng kiểm (kiểm tra hàng) trước khi nhận không?",
    a: "Có! Gear Shop hỗ trợ đồng kiểm ngoại quan cùng bưu tá. Quý khách vui lòng kiểm tra hộp niêm phong, tem mác và sản phẩm nguyên vẹn trước khi ký nhận hoặc thanh toán COD.",
  },
  {
    q: "Làm thế nào để theo dõi hành trình đơn hàng?",
    a: "Sau khi kiện hàng xuất kho, hệ thống sẽ tự động cập nhật mã vận đơn và gửi qua thông báo tài khoản. Bạn có thể tra cứu trạng thái chi tiết bất kỳ lúc nào tại trang Đơn hàng.",
  },
];

export default function ShippingPage() {
  return (
    <div className="py-12 lg:py-16">
      <Container className="max-w-4xl space-y-12">
        {/* Header */}
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Dịch vụ & Vận chuyển</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink lg:text-4xl">Chính sách giao hàng</h1>
          <p className="text-base text-muted">
            Cam kết đóng gói chống sốc kỹ càng, bảo đảm nguyên vẹn 100% đến tay game thủ trên toàn quốc.
          </p>
        </header>

        {/* Phương thức giao hàng */}
        <section aria-labelledby="methods-heading" className="space-y-6">
          <h2 id="methods-heading" className="text-xl font-bold text-ink">
            1. Các hình thức giao hàng & biểu phí
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SHIPPING_METHODS.map((method) => (
              <div
                key={method.title}
                className="flex flex-col justify-between rounded-card border border-line bg-subtle/50 p-5 transition-colors hover:border-accent/40"
              >
                <div className="space-y-2">
                  <h3 className="font-semibold text-ink">{method.title}</h3>
                  <p className="text-xs font-medium text-accent">⏱ {method.time}</p>
                  <p className="text-xs text-muted leading-relaxed">{method.desc}</p>
                </div>
                <div className="mt-4 border-t border-line/60 pt-3">
                  <span className="text-xs font-semibold text-ink">{method.fee}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Miễn phí ship */}
        <section className="rounded-card border border-accent/20 bg-accent/5 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-ink">Freeship đơn từ 1.000.000đ</h3>
              <p className="text-sm text-muted">
                Áp dụng tự động khi đặt chuột, bàn phím, tai nghe hoặc setup gear tại Gear Shop.
              </p>
            </div>
            <Link
              href="/san-pham"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-btn bg-accent px-6 text-sm font-semibold text-accent-text hover:bg-accent/90"
            >
              Mua sắm ngay
            </Link>
          </div>
        </section>

        {/* Quy trình nhận & kiểm hàng */}
        <section aria-labelledby="process-heading" className="space-y-4">
          <h2 id="process-heading" className="text-xl font-bold text-ink">
            2. Quy trình đóng gói và nhận hàng
          </h2>
          <ul className="space-y-3 text-sm text-ink/85">
            <li className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-bold text-accent">1</span>
              <span><strong>Đóng gói an toàn:</strong> Toàn bộ sản phẩm được bọc bóng khí chống va đập, đóng hộp carton cứng cáp và dán băng keo niêm phong thương hiệu.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-bold text-accent">2</span>
              <span><strong>Đồng kiểm bưu tá:</strong> Quý khách được quyền kiểm tra sản phẩm trước khi thanh toán. Nếu bao bì bị móp rách nghiêm trọng hoặc mất niêm phong, bạn có thể từ chối nhận.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-bold text-accent">3</span>
              <span><strong>Quay video mở hộp (Khuyến khích):</strong> Giúp bảo vệ tối đa quyền lợi đổi mới nhanh 1-1 nếu không may phát sinh sự cố bể vỡ hay thiếu phụ kiện do vận chuyển.</span>
            </li>
          </ul>
        </section>

        {/* Câu hỏi thường gặp */}
        <section aria-labelledby="faq-heading" className="space-y-4">
          <h2 id="faq-heading" className="text-xl font-bold text-ink">
            3. Câu hỏi thường gặp về giao hàng
          </h2>
          <div className="space-y-3">
            {SHIPPING_FAQS.map((faq) => (
              <div key={faq.q} className="rounded-card border border-line bg-card p-5">
                <h3 className="font-semibold text-ink text-sm sm:text-base">{faq.q}</h3>
                <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </Container>
    </div>
  );
}

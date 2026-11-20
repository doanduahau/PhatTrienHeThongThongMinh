import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Chính sách đổi trả & bảo hành",
  description: "Quy định bảo hành chính hãng, chính sách đổi mới 7 ngày và quy trình tiếp nhận bảo hành tại Gear Shop.",
};

const WARRANTY_TERMS = [
  {
    title: "Đổi mới trong 7 ngày đầu",
    desc: "Nếu sản phẩm xuất hiện lỗi kỹ thuật từ nhà sản xuất (kẹt switch, double-click, mất nguồn, rè âm...), quý khách được đổi ngay sản phẩm mới 100% hoàn toàn miễn phí.",
    badge: "1 Đổi 1 Nhanh Chóng",
  },
  {
    title: "Bảo hành tiêu chuẩn chính hãng",
    desc: "Thời hạn từ 12 đến 24 tháng theo đúng chính sách từ hãng (Razer, Logitech, Pulsar, Keychron, Herman Miller...). Tem niêm phong và số serial được lưu trữ điện tử theo đơn hàng.",
    badge: "12 – 24 Tháng",
  },
  {
    title: "Hỗ trợ sửa chữa & bảo dưỡng trọn đời",
    desc: "Sau khi hết hạn bảo hành hãng, Gear Shop hỗ trợ thay switch, lube bàn phím, thay feet chuột, sửa dây cáp với chi phí ưu đãi dành riêng cho khách hàng cũ.",
    badge: "Hỗ Trợ Sau Hết Hạn",
  },
];

const WARRANTY_STEPS = [
  {
    step: "1",
    title: "Liên hệ tiếp nhận",
    desc: "Nhắn tin qua trang Liên hệ hoặc gọi Hotline 0904.135.321, cung cấp Số điện thoại đặt hàng hoặc Mã đơn hàng kèm video/ảnh miêu tả lỗi.",
  },
  {
    step: "2",
    title: "Gửi sản phẩm kiểm tra",
    desc: "Mang sản phẩm ghé trực tiếp showroom hoặc gửi chuyển phát nhanh về trung tâm bảo hành Gear Shop. Cửa hàng hỗ trợ phí ship 2 chiều nếu lỗi phát sinh trong 7 ngày đầu.",
  },
  {
    step: "3",
    title: "Kiểm tra & Xử lý",
    desc: "Kỹ thuật viên kiểm tra lỗi trong 24 – 48 giờ làm việc. Tùy theo tình trạng: đổi máy mới hoặc gửi trung tâm bảo hành hãng (xử lý trung bình 3 – 7 ngày làm việc).",
  },
  {
    step: "4",
    title: "Bàn giao sản phẩm",
    desc: "Sau khi hoàn tất, nhân viên liên hệ hẹn quý khách nhận lại thiết bị hoạt động hoàn hảo kèm phiếu xác nhận bảo hành.",
  },
];

const REJECT_CONDITIONS = [
  "Sản phẩm bị biến dạng, cấn móp, nứt vỡ, trầy xước nặng do va đập hoặc rơi rớt.",
  "Sản phẩm bị vô nước, ẩm mốc, cháy nổ, chập điện do sử dụng sai nguồn sạc/củ sạc nhanh không tương thích.",
  "Sản phẩm đã bị tự ý tháo mở, sửa chữa, can thiệp phần cứng hoặc rách/mất tem bảo hành niêm phong.",
  "Sản phẩm hao mòn tự nhiên theo thời gian sử dụng: mòn feet chuột, sờn da đệm tai nghe, bóng bề mặt keycap.",
];

export default function ReturnsPage() {
  return (
    <div className="py-12 lg:py-16">
      <Container className="max-w-4xl space-y-12">
        {/* Header */}
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Cam kết chất lượng</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink lg:text-4xl">Đổi trả & bảo hành</h1>
          <p className="text-base text-muted">
            Minh bạch điều kiện, giải quyết nhanh chóng, bảo vệ tối đa quyền lợi của người dùng gear.
          </p>
        </header>

        {/* 3 Trụ cột cam kết */}
        <section aria-labelledby="terms-heading" className="space-y-6">
          <h2 id="terms-heading" className="text-xl font-bold text-ink">
            1. Chính sách bảo hành & đổi mới
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {WARRANTY_TERMS.map((term) => (
              <div
                key={term.title}
                className="flex flex-col justify-between rounded-card border border-line bg-subtle/50 p-5"
              >
                <div className="space-y-2.5">
                  <span className="inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                    {term.badge}
                  </span>
                  <h3 className="font-semibold text-ink">{term.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{term.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quy trình tiếp nhận */}
        <section aria-labelledby="steps-heading" className="space-y-6">
          <h2 id="steps-heading" className="text-xl font-bold text-ink">
            2. Quy trình bảo hành 4 bước đơn giản
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WARRANTY_STEPS.map((s) => (
              <div key={s.step} className="rounded-card border border-line bg-card p-5 space-y-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-bg">
                  {s.step}
                </span>
                <h3 className="text-sm font-semibold text-ink">{s.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trường hợp từ chối bảo hành */}
        <section aria-labelledby="reject-heading" className="space-y-4 rounded-card border border-line bg-subtle/30 p-6">
          <h2 id="reject-heading" className="text-lg font-bold text-ink">
            3. Các trường hợp không áp dụng bảo hành miễn phí
          </h2>
          <ul className="space-y-2 text-xs sm:text-sm text-ink/80 list-disc list-inside">
            {REJECT_CONDITIONS.map((cond) => (
              <li key={cond} className="leading-relaxed">
                {cond}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted italic">
            * Với các trường hợp trên, Gear Shop vẫn hỗ trợ kiểm tra và sửa chữa dịch vụ tính phí linh kiện gốc nếu còn khả năng phục hồi.
          </p>
        </section>

        {/* Hỗ trợ nhanh */}
        <section className="flex flex-col gap-4 rounded-card bg-ink p-6 text-bg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold">Cần hỗ trợ gấp về đơn hàng hoặc bảo hành?</h3>
            <p className="mt-1 text-sm text-bg/75">
              Đội ngũ kỹ thuật viên luôn sẵn sàng tư vấn trực tiếp từ 9:00 đến 21:00 hàng ngày.
            </p>
          </div>
          <Link
            href="/lien-he"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-btn bg-accent px-6 text-sm font-semibold text-accent-text hover:bg-accent/90"
          >
            Liên hệ hỗ trợ
          </Link>
        </section>
      </Container>
    </div>
  );
}

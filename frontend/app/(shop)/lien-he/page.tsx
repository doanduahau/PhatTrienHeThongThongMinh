import type { Metadata } from "next";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Liên hệ & Hệ thống Showroom",
  description: "Địa chỉ cửa hàng, kênh hỗ trợ khách hàng và thông tin liên hệ của Gear Shop.",
};

const STORES = [
  {
    name: "Showroom PTITHCM (Cơ sở Man Thiện)",
    address: "97 Man Thiện, Phường Hiệp Phú, TP. Thủ Đức, TP. Hồ Chí Minh",
    hours: "08:30 – 20:00 (Tất cả các ngày trong tuần)",
    hotline: "0904.135.321",
    tag: "Trải nghiệm hơn 100+ mẫu chuột, bàn phím cơ & ghế công thái học",
  },
  {
    name: "Showroom PTITHCM (Cơ sở Quận 1)",
    address: "11 Nguyễn Đình Chiểu, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
    hours: "08:30 – 20:00 (Tất cả các ngày trong tuần)",
    hotline: "0904.135.321",
    tag: "Khu vực test switch, lót chuột Cerapad & đo tư vấn setup",
  },
];

const CONTACT_CHANNELS = [
  {
    title: "Hotline tư vấn & đặt hàng",
    detail: "0904.135.321",
    sub: "Hỗ trợ kỹ thuật, kiểm tra tồn kho và giải đáp thắc mắc 9:00 – 21:00",
    action: "tel:0904135321",
    actionLabel: "Gọi ngay",
  },
  {
    title: "Hòm thư hỗ trợ / CSKH",
    detail: "n23dccn009@student.ptithcm.edu.vn",
    sub: "Phản hồi thông tin bảo hành, khiếu nại và hóa đơn VAT trong vòng 24h",
    action: "mailto:n23dccn009@student.ptithcm.edu.vn",
    actionLabel: "Gửi Email",
  },
  {
    title: "Hợp tác kinh doanh & B2B",
    detail: "n23dccn010@student.ptithcm.edu.vn",
    sub: "Cung cấp bàn ghế công thái học, trang bị gaming gear số lượng lớn cho studio, văn phòng",
    action: "mailto:n23dccn010@student.ptithcm.edu.vn",
    actionLabel: "Liên hệ đối tác",
  },
];

export default function ContactPage() {
  return (
    <div className="py-12 lg:py-16">
      <Container className="max-w-4xl space-y-12">
        {/* Header */}
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Thông tin liên lạc</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink lg:text-4xl">Liên hệ & Hệ thống Showroom</h1>
          <p className="text-base text-muted">
            Ghé thăm không gian trải nghiệm thực tế hoặc liên hệ với đội ngũ Gear Shop để được tư vấn chu đáo nhất.
          </p>
        </header>

        {/* Hệ thống Showroom */}
        <section aria-labelledby="stores-heading" className="space-y-6">
          <h2 id="stores-heading" className="text-xl font-bold text-ink">
            1. Địa chỉ cửa hàng & Showroom trải nghiệm
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {STORES.map((store) => (
              <div
                key={store.name}
                className="flex flex-col justify-between rounded-card border border-line bg-card p-6 shadow-xs space-y-4"
              >
                <div className="space-y-3">
                  <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                    {store.name}
                  </span>
                  <div className="space-y-1.5 text-sm">
                    <p className="font-medium text-ink leading-relaxed">📍 {store.address}</p>
                    <p className="text-muted">⏰ {store.hours}</p>
                    <p className="text-muted">📞 Hotline: <span className="font-semibold text-ink">{store.hotline}</span></p>
                  </div>
                </div>
                <div className="border-t border-line/60 pt-3">
                  <p className="text-xs text-muted italic">✨ {store.tag}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Các kênh liên hệ trực tiếp */}
        <section aria-labelledby="channels-heading" className="space-y-6">
          <h2 id="channels-heading" className="text-xl font-bold text-ink">
            2. Các kênh liên hệ trực tiếp
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {CONTACT_CHANNELS.map((ch) => (
              <div
                key={ch.title}
                className="flex flex-col justify-between rounded-card border border-line bg-subtle/50 p-5 space-y-4"
              >
                <div className="space-y-2">
                  <h3 className="font-semibold text-ink text-sm">{ch.title}</h3>
                  <p className="text-xs font-mono font-medium text-accent break-all">{ch.detail}</p>
                  <p className="text-xs text-muted leading-relaxed">{ch.sub}</p>
                </div>
                <a
                  href={ch.action}
                  className="inline-flex h-9 items-center justify-center rounded-btn border border-line bg-bg text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  {ch.actionLabel}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Trải nghiệm showroom */}
        <section className="rounded-card border border-line bg-subtle/40 p-6 sm:p-8 space-y-3">
          <h3 className="text-lg font-bold text-ink">Ghé showroom để thử đúng cảm giác</h3>
          <p className="text-sm text-muted leading-relaxed">
            Mỗi game thủ đều có cỡ tay, dáng cầm chuột và cảm giác phím khác nhau. Đừng ngần ngại ghé showroom Gear Shop để cầm thử form chuột, gõ thử từng switch và ngồi thử các dòng ghế công thái học trước khi quyết định mua.
          </p>
        </section>
      </Container>
    </div>
  );
}

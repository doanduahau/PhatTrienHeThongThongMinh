import type { Metadata } from "next";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Liên hệ" };

export default function ContactPage() {
  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-3xl font-bold text-ink">Liên hệ</h1>
      <div className="mt-6 space-y-3 text-ink/80">
        <p>
          <strong>Cửa hàng:</strong> Gear Shop — chuột, bàn phím, phụ kiện công
          thái học.
        </p>
        <p>
          <strong>Địa chỉ:</strong> 778/B1 Nguyễn Kiệm, Phú Nhuận, TP.HCM —
          273 Nguyễn Văn Lượng, Gò Vấp, TP.HCM
        </p>
        <p>
          <strong>Hotline:</strong> 0904.135.321 — 9:00 đến 21:00 các
          ngày trong tuần.
        </p>
        <p>
          <strong>Email:</strong> n23dccn009@student.ptithcm.edu.vn —
          n23dccn010@student.ptithcm.edu.vn
        </p>
      </div>
    </Container>
  );
}

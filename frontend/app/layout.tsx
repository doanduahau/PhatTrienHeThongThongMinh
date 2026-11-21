import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/components/store";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Gear Shop — chuột, bàn phím, tai nghe cho góc máy chơi game",
    template: "%s — Gear Shop",
  },
  description:
    "Chuột, bàn phím, tai nghe, ghế và lót chuột cho góc máy chơi game. Thông số chi tiết, tìm kiếm bằng câu mô tả.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${beVietnam.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-text"
        >
          Tới nội dung chính
        </a>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}

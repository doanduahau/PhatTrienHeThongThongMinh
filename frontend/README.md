# Gear Shop — Frontend (Next.js)

Frontend Next.js (App Router) + Tailwind CSS v4 + TypeScript, thay thế bản HTML tĩnh cũ.
Thiết kế theo `docs/UI-UX-SKILLS.md` (bố cục tham khảo phongcachxanh.vn).

## Chạy local

Cần business service chạy ở `http://localhost:5001` (xem `docs/Agents.md`). macOS chiếm cổng 5000 cho AirPlay,
còn Next.js dev mặc định lấy 3000.

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000 mặc định — đổi cổng: npm run dev -- -p 3001
```

Production:

```bash
npm run build
npm run start -- -p 3001
```

Biến môi trường (`.env.local`, xem `.env.example`):

| Biến | Mặc định | Ý nghĩa |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5001` | Địa chỉ business service |

## Routes

| Route | Nội dung | Render |
| :--- | :--- | :--- |
| `/` | Trang chủ: hero slideshow, danh mục, gear bán chạy, smart search, cam kết | Server + Suspense |
| `/san-pham` | Tất cả sản phẩm + bộ lọc (hãng, sort, tìm thường / tìm hiểu câu `smart=1`) | Server, searchParams |
| `/danh-muc/[slug]` | Listing một danh mục, hoặc trang nhóm gộp nhiều danh mục (`gaming-gear` = chuột + bàn phím + lót chuột + tai nghe, `office-gear` = ghế + phụ kiện CTH + bàn + soundcard + arm). Slug nằm ở path, không còn `?slug=` | Server, searchParams |
| `/san-pham/[id]` | Chi tiết + thông số + sản phẩm tương tự (ML, có fallback) | Server |
| `/gio-hang` | Giỏ khách (localStorage) / giỏ server, xem đầy đủ | Client |
| `/thanh-toan` | Chọn phí ship + địa chỉ/SĐT, đặt đơn | Client |
| `/dang-nhap` | Đăng nhập / đăng ký, đồng bộ giỏ khách sau đăng nhập | Client |
| `/don-hang` | Lịch sử đơn hàng, huỷ đơn pending | Client |

## Cấu trúc

```
app/            # routes (slug tiếng Việt giữ như bản cũ)
components/     # ui, header, footer, store (auth+giỏ+toast), product-card, hero...
lib/            # api.ts (typed fetch), types.ts, format.ts (tiền tệ vi-VN),
                # nav-data.ts + category-groups.ts (mega-menu và trang nhóm)
```

- Token màu/spacing/radius khai báo trong `app/globals.css` (`:root` + `@theme`), component chỉ dùng class token (`bg-accent`, `text-muted`, `rounded-card`).
- Auth: JWT lưu trong cookie httpOnly `gear_token` (setting ở `lib/server-auth.ts`); client gọi backend qua
  `/api/proxy/[...path]`, không cầm token. Giỏ khách `gear_guest_cart` (localStorage) được đẩy lên server khi đăng nhập.
- ML là enhancement: khối featured/similar tự ẩn khi không có dữ liệu, trang vẫn đầy đủ.

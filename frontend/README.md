# Gear Shop — Frontend (Next.js)

Frontend Next.js (App Router) + Tailwind CSS v4 + TypeScript, thay thế bản HTML tĩnh cũ.
Thiết kế theo `docs/UI-UX-SKILLS.md` (bố cục tham khảo phongcachxanh.vn).

## Chạy local

Cần business service chạy ở `http://localhost:3000` (xem `docs/Agents.md`).

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
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Địa chỉ business service |

## Routes

| Route | Nội dung | Render |
| :--- | :--- | :--- |
| `/` | Trang chủ: hero slideshow, danh mục, gear bán chạy, smart search, cam kết, showroom | Server + Suspense |
| `/san-pham` | Listing + bộ lọc (danh mục, hãng, sort, tìm thường / tìm hiểu câu `smart=1`) | Server, searchParams |
| `/san-pham/[id]` | Chi tiết + thông số + sản phẩm tương tự (ML, có fallback) | Server |
| `/gio-hang` | Giỏ khách (localStorage) / giỏ server + checkout | Client |
| `/dang-nhap` | Đăng nhập / đăng ký, đồng bộ giỏ khách sau đăng nhập | Client |
| `/don-hang` | Lịch sử đơn hàng, huỷ đơn pending | Client |

## Cấu trúc

```
app/            # routes (slug tiếng Việt giữ như bản cũ)
components/     # ui, header, footer, store (auth+giỏ+toast), product-card, hero...
lib/            # api.ts (typed fetch), types.ts, format.ts (tiền tệ vi-VN)
```

- Token màu/spacing/radius khai báo trong `app/globals.css` (`:root` + `@theme`), component chỉ dùng class token (`bg-accent`, `text-muted`, `rounded-card`).
- Auth: JWT lưu localStorage (`gear_token`) như bản cũ; giỏ khách `gear_guest_cart` được đẩy lên server khi đăng nhập.
- ML là enhancement: khối featured/similar tự ẩn khi không có dữ liệu, trang vẫn đầy đủ.

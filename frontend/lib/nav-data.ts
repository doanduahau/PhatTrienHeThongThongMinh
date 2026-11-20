import type { Category } from "@/lib/types";
import { groupPath } from "@/lib/category-groups";

/** Danh mục chính — dùng chung cho carousel và trang chủ. */
export const PRIMARY_CATEGORY_SLUGS = [
  "chuot",
  "ban-phim",
  "lot-chuot",
  "tai-nghe",
  "ghe",
  "phu-kien-cong-thai-hoc",
];

const pickPrimary = (categories: Category[]) => {
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  return PRIMARY_CATEGORY_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (category): category is Category => Boolean(category),
  );
};

export type NavGroupLink = { label: string; href: string };

export type NavGroupColumn = {
  name: string;
  href: string;
  links: NavGroupLink[];
};

export type NavFeaturedCard = {
  title: string;
  href: string;
  image: string;
};

export type NavGroup = {
  name: string;
  viewAll: NavGroupLink;
  columns: NavGroupColumn[];
  featured?: {
    large: NavFeaturedCard;
    small1: NavFeaturedCard;
    small2: NavFeaturedCard;
  };
};

/** Trang danh mục kèm bộ lọc backend cơ bản (không dùng q/ML ở trang lọc). */
const catalog = (slug: string, filters?: Record<string, string>) => {
  const qs = filters ? new URLSearchParams(filters).toString() : "";
  return qs ? `/danh-muc/${slug}?${qs}` : `/danh-muc/${slug}`;
};

/** Mega-menu tĩnh: nhóm → cột danh mục → link bộ lọc. Giá trị enum khớp DB (SELECT DISTINCT). */
export const NAV_GROUPS: NavGroup[] = [
  {
    name: "Gaming Gear",
    viewAll: { label: "Xem tất cả Gaming Gear", href: groupPath("gaming-gear") },
    featured: {
      large: {
        title: "Wooting 60HE+",
        href: "/san-pham/228",
        image: "https://media.karousell.com/media/photos/products/2023/10/23/instock_wooting_60he__ansi_lay_1698061253_404deee0_progressive",
      },
      small1: {
        title: "Razer Viper V3 Pro",
        href: "/san-pham/21",
        image: "https://cdn.4games.pro/storage/products/4785/9d05249c0cfc48326d9bcc095eca198e.jpg",
      },
      small2: {
        title: "Logitech G Pro X",
        href: "/san-pham/1",
        image: "https://cdn.shopify.com/s/files/1/0636/9044/0949/products/chu-t-khong-day-sieu-nh-logitech-g-pro-x-superlight-wireless-37089285996789.jpg?v=1677194289",
      },
    },
    columns: [
      {
        name: "Chuột Gaming",
        href: catalog("chuot"),
        links: [
          { label: "Chuột không dây", href: catalog("chuot", { connectivity: "wireless" }) },
          { label: "Chuột siêu nhẹ", href: catalog("chuot", { maxWeight: "54" }) },
          { label: "Chuột có dây", href: catalog("chuot", { connectivity: "wired" }) },
          { label: "Chuột 8K", href: catalog("chuot", { pollingRate: "8000" }) },
        ],
      },
      {
        name: "Bàn Phím",
        href: catalog("ban-phim"),
        links: [
          { label: "Bàn phím không dây", href: catalog("ban-phim", { connectivity: "wireless" }) },
          { label: "Bàn phím 3 chế độ", href: catalog("ban-phim", { connectivity: "tri_mode" }) },
          { label: "Bàn phím TKL", href: catalog("ban-phim", { layout: "TKL" }) },
          { label: "Bàn phím 75%", href: catalog("ban-phim", { layout: "75%" }) },
        ],
      },
      {
        name: "Lót Chuột",
        href: catalog("lot-chuot"),
        links: [
          { label: "Lót chuột vải", href: catalog("lot-chuot", { surface: "cloth" }) },
          { label: "Lót chuột kính", href: catalog("lot-chuot", { surface: "glass" }) },
          { label: "Lót chuột XL", href: catalog("lot-chuot", { size: "XL" }) },
        ],
      },
      {
        name: "Tai Nghe",
        href: catalog("tai-nghe"),
        links: [
          { label: "Tai nghe chụp tai", href: catalog("tai-nghe", { headphoneType: "over_ear" }) },
          { label: "IEM / nhét tai", href: catalog("tai-nghe", { headphoneType: "in_ear" }) },
          { label: "Soundcard", href: catalog("soundcard") },
        ],
      },
    ],
  },
  {
    name: "Office Gear",
    viewAll: { label: "Xem tất cả Office Gear", href: groupPath("office-gear") },
    featured: {
      large: {
        title: "Herman Miller Aeron",
        href: "/san-pham/328",
        image: "https://www.theofficefurniturestore.co.uk/media/catalog/product/cache/1/image/1200x1200/9df78eab33525d08d6e5fb8d27136e95/a/e/aeron_mineral_frame_satin_chassis_dark_vapour_base_rear.jpg",
      },
      small1: {
        title: "Embody Gaming",
        href: "/san-pham/330",
        image: "https://cdn.shopify.com/s/files/1/0411/4448/3995/products/Embody_Cyan_02_dc8c17b4-3a11-46e1-a643-31c21a6278a4_1280x1280.png?v=1628693749",
      },
      small2: {
        title: "Steelcase Gesture",
        href: "/san-pham/331",
        image: "https://cdn.shopify.com/s/files/1/0370/9557/1591/products/971DFC6C-F7D3-4256-96C9-56CD0E0657E1_1_201_a.jpg?v=1588580056",
      },
    },
    columns: [
      {
        name: "Ghế công thái học",
        href: catalog("ghe"),
        links: [
          { label: "Ghế tải trọng 150kg+", href: catalog("ghe", { maxLoadKg: "150" }) },
          { label: "Ghế tải trọng 180kg+", href: catalog("ghe", { maxLoadKg: "180" }) },
        ],
      },
      {
        name: "Bàn & Arm màn hình",
        href: catalog("ban"),
        links: [
          { label: "Bàn làm việc", href: catalog("ban") },
          { label: "Arm màn hình", href: catalog("arm-man-hinh") },
        ],
      },
      {
        name: "Phụ kiện công thái học",
        href: catalog("phu-kien-cong-thai-hoc"),
        links: [
          { label: "Kê cổ tay", href: catalog("phu-kien-cong-thai-hoc", { setupCategory: "accessory" }) },
          { label: "Tất cả phụ kiện", href: catalog("phu-kien-cong-thai-hoc") },
        ],
      },
    ],
  },
];

/** Các trang thông tin trên topbar. */
export const INFO_LINKS: NavGroupLink[] = [
  { label: "Giao hàng", href: "/giao-hang" },
  { label: "Đổi trả & bảo hành", href: "/doi-tra-bao-hanh" },
  { label: "Liên hệ", href: "/lien-he" },
];

export { pickPrimary };

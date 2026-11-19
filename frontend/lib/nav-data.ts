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

export type NavGroup = {
  name: string;
  viewAll: NavGroupLink;
  columns: NavGroupColumn[];
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
        ],
      },
    ],
  },
  {
    name: "Office Gear",
    viewAll: { label: "Xem tất cả Office Gear", href: groupPath("office-gear") },
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
        name: "Phụ kiện công thái học",
        href: catalog("phu-kien-cong-thai-hoc"),
        links: [],
      },
      {
        name: "Bàn & Phụ kiện màn hình",
        href: catalog("ban"),
        links: [
          { label: "Bàn làm việc", href: catalog("ban") },
          { label: "Arm màn hình", href: catalog("arm-man-hinh") },
          { label: "Soundcard & DAC/AMP", href: catalog("soundcard") },
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

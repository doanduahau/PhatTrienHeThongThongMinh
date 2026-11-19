/**
 * Nhóm danh mục cho mega-menu: một slug trang nhóm gom nhiều danh mục thật.
 * Backend nhận `slug=a,b,c` nên trang nhóm lọc/sort/phân trang/server-side như trang danh mục.
 */
export type CategoryGroup = {
  slug: string;
  name: string;
  slugs: string[];
};

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    slug: "gaming-gear",
    name: "Gaming Gear",
    slugs: ["chuot", "ban-phim", "lot-chuot", "tai-nghe"],
  },
  {
    slug: "office-gear",
    name: "Office Gear",
    slugs: ["ghe", "phu-kien-cong-thai-hoc", "ban", "soundcard", "arm-man-hinh"],
  },
];

export const getGroup = (slug?: string) =>
  slug ? CATEGORY_GROUPS.find((group) => group.slug === slug) ?? null : null;

export const groupPath = (slug: string) => `/danh-muc/${slug}`;

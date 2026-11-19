"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Brand } from "@/lib/types";

type QueryUpdates = Record<string, string | undefined>;
type FilterOption = { label: string; set: QueryUpdates };
type GetParam = (key: string) => string;
type CreateUrl = (updates: QueryUpdates) => string;

const opt = (label: string, set: QueryUpdates): FilterOption => ({ label, set });

/**
 * Toàn bộ giá trị dưới đây lấy theo SELECT DISTINCT trên mice / keyboards / headphones /
 * mousepads / setups nên mỗi option đều có sản phẩm thật. Khi thêm option mới, kiểm tra
 * số dòng khớp lớn hơn 0 trước: một lựa chọn luôn trả trang trống còn gây hiểu nhầm hơn
 * cả việc không có bộ lọc.
 */

const CONNECTIVITY_GEAR: FilterOption[] = [
  opt("Không dây (Wireless)", { connectivity: "wireless" }),
  opt("Có dây (Wired)", { connectivity: "wired" }),
  opt("3 chế độ (Tri-mode)", { connectivity: "tri_mode" }),
];

const CONNECTIVITY_AUDIO: FilterOption[] = [
  opt("Không dây 2.4GHz", { connectivity: "wireless_2.4g" }),
  opt("Bluetooth", { connectivity: "bluetooth" }),
  opt("Có dây 3.5mm", { connectivity: "wired_3.5mm" }),
];

const MOUSE_ORIENTATION: FilterOption[] = [
  opt("Đối xứng (Symmetrical)", { handOrientation: "symmetrical" }),
  opt("Công thái học (Ergonomic)", { handOrientation: "ergonomic" }),
];

// Backend so gte/lte nên biên mỗi khoảng dịch 1g để ba khoảng không đếm trùng sản phẩm.
const MOUSE_WEIGHT: FilterOption[] = [
  opt("Siêu nhẹ (< 55g)", { minWeight: undefined, maxWeight: "54" }),
  opt("55g - 65g", { minWeight: "55", maxWeight: "65" }),
  opt("Trên 65g", { minWeight: "66", maxWeight: undefined }),
];

const MOUSE_POLLING: FilterOption[] = [
  opt("125Hz", { pollingRate: "125" }),
  opt("1000Hz (1K)", { pollingRate: "1000" }),
  opt("2000Hz (2K)", { pollingRate: "2000" }),
  opt("4000Hz (4K)", { pollingRate: "4000" }),
  opt("8000Hz (8K)", { pollingRate: "8000" }),
];

const MOUSE_SWITCH: FilterOption[] = [
  opt("Switch Quang học (Optical)", { switchType: "Optical" }),
  opt("Switch Cơ học (Mechanical)", { switchType: "Mechanical" }),
];

const KEYBOARD_LAYOUT: FilterOption[] = [
  opt("60%", { layout: "60%" }),
  opt("65%", { layout: "65%" }),
  opt("75%", { layout: "75%" }),
  opt("TKL (87 phím)", { layout: "TKL" }),
  opt("Fullsize", { layout: "Fullsize" }),
];

const KEYBOARD_FLAGS = [
  { label: "Rapid Trigger (Từ tính HE)", param: "hasRapidTrigger" },
  { label: "Hỗ trợ Hotswap", param: "hasHotswap" },
  { label: "Hỗ trợ macOS", param: "supportMacos" },
];

// Bảng headphones không có dòng on_ear nào (chỉ over_ear / in_ear / soundcard).
const HEADPHONE_TYPE: FilterOption[] = [
  opt("Over-ear (Chụp tai)", { headphoneType: "over_ear" }),
  opt("In-ear (Nhét tai)", { headphoneType: "in_ear" }),
];

const HEADPHONE_FLAGS = [
  { label: "Có micro đàm thoại", param: "hasMic" },
  { label: "Chống ồn chủ động (ANC)", param: "hasAnc" },
];

// Soundcard: 10/10 cùng kiểu wired_3.5mm và headphone_type = 'soundcard', 0/10 có ANC,
// nên chỉ còn micro là thuộc tính phân loại được.
const SOUNDCARD_FLAGS = [{ label: "Có micro đàm thoại", param: "hasMic" }];

const MOUSEPAD_TYPE: FilterOption[] = [
  opt("Control", { padType: "control" }),
  opt("Speed", { padType: "speed" }),
  opt("Hybrid", { padType: "hybrid" }),
];

const MOUSEPAD_CONTROL: FilterOption[] = [
  opt("Cao", { mouseControl: "high" }),
  opt("Trung bình", { mouseControl: "medium" }),
  opt("Thấp", { mouseControl: "low" }),
];

const MOUSEPAD_SPEED: FilterOption[] = [
  opt("Nhanh", { speed: "fast" }),
  opt("Vừa", { speed: "medium" }),
  opt("Chậm", { speed: "slow" }),
];

const MOUSEPAD_SURFACE: FilterOption[] = [
  opt("Vải (Cloth)", { surface: "cloth" }),
  opt("Lai (Hybrid)", { surface: "hybrid" }),
  opt("Kính (Glass)", { surface: "glass" }),
];

const MOUSEPAD_BASE: FilterOption[] = [
  opt("Cao su (Rubber)", { base: "rubber" }),
  opt("Poron", { base: "poron" }),
  opt("Silicone", { base: "silicone" }),
];

const MOUSEPAD_SIZE: FilterOption[] = [
  opt("XL", { size: "XL" }),
  opt("L", { size: "L" }),
  opt("M", { size: "M" }),
];

const SETUP_SLUGS = ["ghe", "ban", "arm-man-hinh", "phu-kien-cong-thai-hoc"];

// Trang nhóm Office Gear gộp 4 danh mục setup nên cần lọc theo loại; trang một danh mục
// thì cả danh mục chỉ có một loại, lọc không đổi được gì.
const SETUP_TYPE: FilterOption[] = [
  opt("Ghế công thái học", { setupCategory: "chair" }),
  opt("Bàn đứng / bàn làm việc", { setupCategory: "desk" }),
  opt("Arm màn hình", { setupCategory: "arm" }),
  opt("Phụ kiện công thái học", { setupCategory: "accessory" }),
];

// Ngưỡng chọn theo min/max thật: ghế 130-180kg, bàn 70-160kg. Arm (9-20kg) và phụ kiện
// (6/10 dòng NULL) không có ngưỡng nào cắt được danh sách nên không có bộ lọc tải trọng.
const LOAD_BY_SLUG: Record<string, FilterOption[]> = {
  ghe: [
    opt("Từ 150kg trở lên", { maxLoadKg: "150" }),
    opt("Từ 180kg trở lên", { maxLoadKg: "180" }),
  ],
  ban: [
    opt("Từ 100kg trở lên", { maxLoadKg: "100" }),
    opt("Từ 150kg trở lên", { maxLoadKg: "150" }),
  ],
};

const PRICE_ALL: FilterOption[] = [
  opt("Dưới 1.000.000đ", { minPrice: undefined, maxPrice: "1000000" }),
  opt("1.000.000đ - 2.000.000đ", { minPrice: "1000000", maxPrice: "2000000" }),
  opt("2.000.000đ - 3.500.000đ", { minPrice: "2000000", maxPrice: "3500000" }),
  opt("Trên 3.500.000đ", { minPrice: "3500000", maxPrice: undefined }),
];

// Lót chuột/phụ kiện rẻ và bàn/ghế đắt nằm ngoài các khoảng trên nên dùng bộ riêng.
const PRICE_BY_SLUG: Record<string, FilterOption[]> = {
  "lot-chuot": [
    opt("Dưới 700.000đ", { minPrice: undefined, maxPrice: "700000" }),
    opt("700.000đ - 1.000.000đ", { minPrice: "700000", maxPrice: "1000000" }),
    opt("Trên 1.000.000đ", { minPrice: "1000000", maxPrice: undefined }),
  ],
  "phu-kien-cong-thai-hoc": [
    opt("Dưới 600.000đ", { minPrice: undefined, maxPrice: "600000" }),
    opt("600.000đ - 900.000đ", { minPrice: "600000", maxPrice: "900000" }),
    opt("Trên 900.000đ", { minPrice: "900000", maxPrice: undefined }),
  ],
  ban: [
    opt("5.000.000đ - 8.000.000đ", { minPrice: "5000000", maxPrice: "8000000" }),
    opt("8.000.000đ - 12.000.000đ", { minPrice: "8000000", maxPrice: "12000000" }),
    opt("Trên 12.000.000đ", { minPrice: "12000000", maxPrice: undefined }),
  ],
  ghe: [
    opt("2.000.000đ - 6.000.000đ", { minPrice: "2000000", maxPrice: "6000000" }),
    opt("6.000.000đ - 10.000.000đ", { minPrice: "6000000", maxPrice: "10000000" }),
    opt("10.000.000đ - 20.000.000đ", { minPrice: "10000000", maxPrice: "20000000" }),
    opt("Trên 20.000.000đ", { minPrice: "20000000", maxPrice: undefined }),
  ],
};

const FILTER_KEYS = [
  "inStock",
  "brandId",
  "connectivity",
  "handOrientation",
  "pollingRate",
  "minWeight",
  "maxWeight",
  "switchType",
  "layout",
  "hasRapidTrigger",
  "hasHotswap",
  "supportMacos",
  "headphoneType",
  "hasMic",
  "hasAnc",
  "padType",
  "mouseControl",
  "speed",
  "surface",
  "base",
  "size",
  "setupCategory",
  "maxLoadKg",
  "minPrice",
  "maxPrice",
];

function AccordionGroup({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-line py-3.5">
      <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-ink select-none">
        <span>{title}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 text-muted transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

const rowClass = (active: boolean) =>
  `flex items-center justify-between rounded-btn px-2.5 py-1.5 transition-colors ${
    active ? "bg-accent-soft font-semibold text-accent" : "text-ink hover:bg-subtle"
  }`;

/** Nhóm radio: mỗi option ghi đè đúng các query key nó quản lý, "Tất cả" xóa sạch các key đó. */
function OptionGroup({
  title,
  keys,
  options,
  getParam,
  createUrl,
  scroll = false,
}: {
  title: string;
  keys: string[];
  options: FilterOption[];
  getParam: GetParam;
  createUrl: CreateUrl;
  scroll?: boolean;
}) {
  const rows: FilterOption[] = [
    { label: "Tất cả", set: Object.fromEntries(keys.map((key) => [key, undefined])) },
    ...options,
  ];
  return (
    <AccordionGroup title={title}>
      <div
        className={`space-y-1 text-sm ${scroll ? "max-h-56 overflow-y-auto pr-1" : ""}`}
      >
        {rows.map((row) => {
          const active = Object.entries(row.set).every(
            ([key, value]) => getParam(key) === (value ?? ""),
          );
          return (
            <Link key={row.label} href={createUrl(row.set)} scroll={false} className={rowClass(active)}>
              <span>{row.label}</span>
              {active ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="size-3.5 text-accent"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : null}
            </Link>
          );
        })}
      </div>
    </AccordionGroup>
  );
}

/** Nhóm checkbox: bật thì gán "1", bỏ thì xóa key để URL không mang tham số chết. */
function FlagGroup({
  title,
  flags,
  getParam,
  createUrl,
}: {
  title: string;
  flags: { label: string; param: string }[];
  getParam: GetParam;
  createUrl: CreateUrl;
}) {
  const router = useRouter();
  return (
    <AccordionGroup title={title}>
      <div className="space-y-2 pt-1 text-sm">
        {flags.map((flag) => (
          <label key={flag.param} className="flex cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={getParam(flag.param) === "1"}
              onChange={(event) =>
                router.push(createUrl({ [flag.param]: event.target.checked ? "1" : undefined }), { scroll: false })
              }
              className="size-4 rounded border-line text-accent focus:ring-accent"
            />
            <span>{flag.label}</span>
          </label>
        ))}
      </div>
    </AccordionGroup>
  );
}

export function CategoryFilters({
  slugs = [],
  basePath = "/san-pham",
  brands,
}: {
  slugs?: string[];
  basePath?: string;
  brands: Brand[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getParam = (key: string) => searchParams.get(key) ?? "";

  const createUrl = (updates: QueryUpdates) => {
    const params = new URLSearchParams(searchParams.toString());
    // Luôn reset về trang 1 khi đổi bộ lọc
    params.delete("page");

    for (const [key, val] of Object.entries(updates)) {
      if (val === undefined || val === "" || val === null) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const inStock = getParam("inStock") === "1";
  const hasSlug = (slug: string) => slugs.includes(slug);
  const singleCategory = slugs.length === 1;
  const setupPresent = SETUP_SLUGS.filter(hasSlug);

  const hasActiveFilters = FILTER_KEYS.some((key) => getParam(key) !== "");
  const priceOptions =
    (singleCategory ? PRICE_BY_SLUG[slugs[0]] : undefined) ?? PRICE_ALL;
  const loadOptions = singleCategory ? LOAD_BY_SLUG[slugs[0]] : undefined;

  // Bộ lọc đã chọn được lưu vào localStorage theo từng trang (basePath);
  // q/smart/page là trạng thái điều hướng nên không lưu.
  const storageKey = `gear_filters${basePath}`;

  useEffect(() => {
    const saved = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = searchParams.get(key);
      if (value) saved.set(key, value);
    }
    const qs = saved.toString();
    if (qs) localStorage.setItem(storageKey, qs);
    else localStorage.removeItem(storageKey);
  }, [searchParams, storageKey]);

  // Vào trang với URL sạch (không tham số nào) thì khôi phục bộ lọc cũ.
  useEffect(() => {
    if ([...searchParams.keys()].length > 0) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) router.replace(`${basePath}?${saved}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <aside aria-label="Bộ lọc" className="space-y-1">
      {/* Tiêu đề & Đặt lại */}
      <div className="flex min-h-[34px] items-center justify-between border-b border-line bg-bg pb-4">
        <div className="flex items-center gap-2 font-bold text-base text-ink">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          <span>Bộ lọc</span>
        </div>
        {hasActiveFilters ? (
          <Link href={basePath} scroll={false} className="text-xs font-semibold text-accent hover:underline">
            Đặt lại tất cả
          </Link>
        ) : null}
      </div>

      {/* Phần thân sidebar: trôi theo trang, cuộn riêng khi rê chuột vào (scrollbar ẩn, hiện khi hover) */}
      <div className="space-y-1 xl:max-h-[calc(100svh-9rem)] xl:overflow-y-auto xl:pe-2 xl:[scrollbar-width:none] xl:[&::-webkit-scrollbar]:hidden xl:hover:[scrollbar-width:thin] xl:hover:[&::-webkit-scrollbar]:block xl:hover:[&::-webkit-scrollbar]:w-2 xl:hover:[&::-webkit-scrollbar-thumb]:rounded-full xl:hover:[&::-webkit-scrollbar-thumb]:bg-line">
      {/* Switch Còn hàng */}
      <div className="flex items-center justify-between border-b border-line py-3">
        <span className="text-sm font-medium text-ink">Còn hàng</span>
        <button
          type="button"
          role="switch"
          aria-checked={inStock}
          onClick={() => router.push(createUrl({ inStock: inStock ? undefined : "1" }), { scroll: false })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            inStock ? "bg-accent" : "bg-line"
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              inStock ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {brands.length > 0 ? (
        <OptionGroup
          title="Thương hiệu"
          keys={["brandId"]}
          scroll
          getParam={getParam}
          createUrl={createUrl}
          options={brands.map((brand) =>
            opt(brand.name, { brandId: String(brand.id) }),
          )}
        />
      ) : null}

      {hasSlug("chuot") ? (
        <>
          <OptionGroup
            title="Kết nối"
            keys={["connectivity"]}
            options={CONNECTIVITY_GEAR}
            getParam={getParam}
            createUrl={createUrl}
          />
          <OptionGroup
            title="Form dáng / Cách cầm"
            keys={["handOrientation"]}
            options={MOUSE_ORIENTATION}
            getParam={getParam}
            createUrl={createUrl}
          />
          <OptionGroup
            title="Trọng lượng"
            keys={["minWeight", "maxWeight"]}
            options={MOUSE_WEIGHT}
            getParam={getParam}
            createUrl={createUrl}
          />
          <OptionGroup
            title="Polling rate"
            keys={["pollingRate"]}
            options={MOUSE_POLLING}
            getParam={getParam}
            createUrl={createUrl}
          />
          <OptionGroup
            title="Loại switch"
            keys={["switchType"]}
            options={MOUSE_SWITCH}
            getParam={getParam}
            createUrl={createUrl}
          />
        </>
      ) : null}

      {hasSlug("ban-phim") ? (
        <>
          <OptionGroup
            title="Layout bàn phím"
            keys={["layout"]}
            options={KEYBOARD_LAYOUT}
            getParam={getParam}
            createUrl={createUrl}
          />
          <FlagGroup
            title="Tính năng & Công nghệ"
            flags={KEYBOARD_FLAGS}
            getParam={getParam}
            createUrl={createUrl}
          />
          <OptionGroup
            title="Kết nối"
            keys={["connectivity"]}
            options={CONNECTIVITY_GEAR}
            getParam={getParam}
            createUrl={createUrl}
          />
        </>
      ) : null}

      {hasSlug("tai-nghe") ? (
        <>
          <OptionGroup
            title="Kiểu dáng tai nghe"
            keys={["headphoneType"]}
            options={HEADPHONE_TYPE}
            getParam={getParam}
            createUrl={createUrl}
          />
          <OptionGroup
            title="Kết nối"
            keys={["connectivity"]}
            options={CONNECTIVITY_AUDIO}
            getParam={getParam}
            createUrl={createUrl}
          />
          <FlagGroup
            title="Tính năng"
            flags={HEADPHONE_FLAGS}
            getParam={getParam}
            createUrl={createUrl}
          />
        </>
      ) : null}

      {hasSlug("soundcard") && !hasSlug("tai-nghe") ? (
        <FlagGroup
          title="Tính năng"
          flags={SOUNDCARD_FLAGS}
          getParam={getParam}
          createUrl={createUrl}
        />
      ) : null}

      {hasSlug("lot-chuot") ? (
        <>
          <OptionGroup
            title="Loại lót"
            keys={["padType"]}
            options={MOUSEPAD_TYPE}
            getParam={getParam}
            createUrl={createUrl}
          />
          <OptionGroup
            title="Kích thước"
            keys={["size"]}
            options={MOUSEPAD_SIZE}
            getParam={getParam}
            createUrl={createUrl}
          />
          <OptionGroup
            title="Bề mặt"
            keys={["surface"]}
            options={MOUSEPAD_SURFACE}
            getParam={getParam}
            createUrl={createUrl}
          />
          <OptionGroup
            title="Tốc độ trượt"
            keys={["speed"]}
            options={MOUSEPAD_SPEED}
            getParam={getParam}
            createUrl={createUrl}
          />
          <OptionGroup
            title="Độ kiểm soát chuột"
            keys={["mouseControl"]}
            options={MOUSEPAD_CONTROL}
            getParam={getParam}
            createUrl={createUrl}
          />
          <OptionGroup
            title="Đế lót"
            keys={["base"]}
            options={MOUSEPAD_BASE}
            getParam={getParam}
            createUrl={createUrl}
          />
        </>
      ) : null}

      {setupPresent.length > 1 ? (
        <OptionGroup
          title="Loại sản phẩm"
          keys={["setupCategory"]}
          options={SETUP_TYPE}
          getParam={getParam}
          createUrl={createUrl}
        />
      ) : null}

      {loadOptions ? (
        <OptionGroup
          title="Tải trọng tối thiểu"
          keys={["maxLoadKg"]}
          options={loadOptions}
          getParam={getParam}
          createUrl={createUrl}
        />
      ) : null}

      <OptionGroup
        title="Khoảng giá"
        keys={["minPrice", "maxPrice"]}
        options={priceOptions}
        getParam={getParam}
        createUrl={createUrl}
      />
      </div>
    </aside>
  );
}

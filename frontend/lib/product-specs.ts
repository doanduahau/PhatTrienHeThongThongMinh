/**
 * Bảng thông số chi tiết theo slug danh mục — khớp 1:1 với detailSchemas trong
 * backend/business-service/src/validators/product.validator.js. Danh mục có mục ở
 * đây thì backend BẮT BUỘC gửi `detail` khi tạo sản phẩm.
 */
export type SpecField = {
  key: string;
  label: string;
  kind: "text" | "number" | "select" | "boolean";
  required?: boolean;
  options?: { value: string; label: string }[];
  default?: string | number | boolean;
};

const SETUP_TYPES = [
  { value: "chair", label: "Ghế" },
  { value: "desk", label: "Bàn" },
  { value: "arm", label: "Arm màn hình" },
  { value: "accessory", label: "Phụ kiện" },
];

const CONNECTIVITY_GEAR = [
  { value: "wired", label: "Có dây" },
  { value: "wireless", label: "Không dây" },
  { value: "tri_mode", label: "3 chế độ" },
];

const CONNECTIVITY_AUDIO = [
  { value: "wired_3.5mm", label: "Có dây 3.5mm" },
  { value: "wireless_2.4g", label: "Không dây 2.4GHz" },
  { value: "bluetooth", label: "Bluetooth" },
];

export const SPEC_BY_SLUG: Record<string, SpecField[]> = {
  chuot: [
    { key: "connectivity", label: "Kết nối", kind: "select", required: true, options: CONNECTIVITY_GEAR },
    {
      key: "handOrientation",
      label: "Form dáng",
      kind: "select",
      required: true,
      options: [
        { value: "symmetrical", label: "Đối xứng" },
        { value: "ergonomic", label: "Công thái học" },
      ],
    },
    { key: "weightG", label: "Trọng lượng (g)", kind: "number", required: true },
    {
      key: "pollingRateHz",
      label: "Polling rate (Hz)",
      kind: "select",
      options: [125, 1000, 2000, 4000, 8000].map((value) => ({ value: String(value), label: `${value}Hz` })),
    },
    { key: "switchType", label: "Loại switch", kind: "text" },
    { key: "sensor", label: "Cảm biến", kind: "text" },
  ],
  "ban-phim": [
    { key: "connectivity", label: "Kết nối", kind: "select", required: true, options: CONNECTIVITY_GEAR },
    {
      key: "layout",
      label: "Layout",
      kind: "select",
      required: true,
      options: ["60%", "65%", "75%", "TKL", "Fullsize"].map((value) => ({ value, label: value })),
    },
    {
      key: "pollingRateHz",
      label: "Polling rate (Hz)",
      kind: "select",
      options: [1000, 2000, 4000, 8000].map((value) => ({ value: String(value), label: `${value}Hz` })),
    },
    { key: "hasRapidTrigger", label: "Rapid Trigger", kind: "boolean" },
    { key: "hasHotswap", label: "Hotswap", kind: "boolean" },
    { key: "supportMacos", label: "Hỗ trợ macOS", kind: "boolean" },
    { key: "switch", label: "Switch", kind: "text" },
  ],
  "tai-nghe": [
    { key: "connectivity", label: "Kết nối", kind: "select", required: true, options: CONNECTIVITY_AUDIO },
    {
      key: "headphoneType",
      label: "Kiểu dáng",
      kind: "select",
      required: true,
      options: [
        { value: "over_ear", label: "Chụp tai" },
        { value: "in_ear", label: "Nhét tai" },
        { value: "on_ear", label: "Ôm tai" },
      ],
    },
    { key: "hasMic", label: "Có micro", kind: "boolean" },
    { key: "hasAnc", label: "Chống ồn ANC", kind: "boolean" },
  ],
  soundcard: [
    { key: "connectivity", label: "Kết nối", kind: "select", required: true, default: "wired_3.5mm", options: CONNECTIVITY_AUDIO },
    { key: "headphoneType", label: "Kiểu dáng", kind: "select", required: true, default: "soundcard", options: [{ value: "soundcard", label: "Soundcard" }] },
    { key: "hasMic", label: "Có micro", kind: "boolean" },
    { key: "hasAnc", label: "Chống ồn ANC", kind: "boolean" },
  ],
  "lot-chuot": [
    {
      key: "padType",
      label: "Loại lót",
      kind: "select",
      options: [
        { value: "control", label: "Control" },
        { value: "speed", label: "Speed" },
        { value: "hybrid", label: "Hybrid" },
      ],
    },
    {
      key: "size",
      label: "Kích thước",
      kind: "select",
      options: ["XL", "L", "M"].map((value) => ({ value, label: value })),
    },
    {
      key: "surface",
      label: "Bề mặt",
      kind: "select",
      options: [
        { value: "cloth", label: "Vải" },
        { value: "hybrid", label: "Lai" },
        { value: "glass", label: "Kính" },
      ],
    },
    {
      key: "speed",
      label: "Tốc độ trượt",
      kind: "select",
      options: [
        { value: "fast", label: "Nhanh" },
        { value: "medium", label: "Vừa" },
        { value: "slow", label: "Chậm" },
      ],
    },
    {
      key: "mouseControl",
      label: "Độ kiểm soát",
      kind: "select",
      options: [
        { value: "high", label: "Cao" },
        { value: "medium", label: "Trung bình" },
        { value: "low", label: "Thấp" },
      ],
    },
    {
      key: "base",
      label: "Đế",
      kind: "select",
      options: [
        { value: "rubber", label: "Cao su" },
        { value: "poron", label: "Poron" },
        { value: "silicone", label: "Silicone" },
      ],
    },
  ],
  setup: [
    { key: "setupCategory", label: "Loại", kind: "select", required: true, options: SETUP_TYPES },
    { key: "maxLoadKg", label: "Tải trọng (kg)", kind: "number" },
  ],
  ghe: [
    { key: "setupCategory", label: "Loại", kind: "select", required: true, default: "chair", options: SETUP_TYPES },
    { key: "maxLoadKg", label: "Tải trọng (kg)", kind: "number" },
  ],
  ban: [
    { key: "setupCategory", label: "Loại", kind: "select", required: true, default: "desk", options: SETUP_TYPES },
    { key: "maxLoadKg", label: "Tải trọng (kg)", kind: "number" },
  ],
  "arm-man-hinh": [
    { key: "setupCategory", label: "Loại", kind: "select", required: true, default: "arm", options: SETUP_TYPES },
    { key: "maxLoadKg", label: "Tải trọng (kg)", kind: "number" },
  ],
  "phu-kien-cong-thai-hoc": [
    { key: "setupCategory", label: "Loại", kind: "select", required: true, default: "accessory", options: SETUP_TYPES },
    { key: "maxLoadKg", label: "Tải trọng (kg)", kind: "number" },
  ],
};

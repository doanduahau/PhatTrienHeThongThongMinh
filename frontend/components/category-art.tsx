/** Icon line-art theo danh mục — dùng khi sản phẩm chưa có ảnh thật. */
const PATHS: Record<string, React.ReactNode> = {
  chuot: (
    <>
      <rect x="12" y="5" width="16" height="30" rx="8" />
      <path d="M20 5v12M12 17h16" />
    </>
  ),
  "ban-phim": (
    <>
      <rect x="4" y="12" width="32" height="17" rx="3" />
      <path d="M8 17h2M13 17h2M18 17h2M23 17h2M28 17h4M8 21h2M13 21h2M18 21h2M23 21h2M28 21h4M8 25h6M17 25h6M26 25h6" />
    </>
  ),
  "lot-chuot": (
    <>
      <rect x="5" y="11" width="30" height="20" rx="3" />
      <path d="M10 17h8M25 16h3v10h-3z" />
    </>
  ),
  "tai-nghe": (
    <>
      <path d="M8 22v-3a12 12 0 0 1 24 0v3" />
      <rect x="5" y="21" width="6" height="11" rx="2" />
      <rect x="29" y="21" width="6" height="11" rx="2" />
    </>
  ),
  ghe: (
    <>
      <path d="M14 5h12v14H14zM10 21h20v4H10zM20 25v8M14 33h12" />
    </>
  ),
  ban: (
    <>
      <path d="M5 14h30v4H5zM9 18v16M31 18v16" />
    </>
  ),
  "arm-man-hinh": (
    <>
      <path d="M8 33h10M13 33V18M13 18h12a4 4 0 0 0 4-4V9" />
      <rect x="24" y="5" width="11" height="8" rx="2" />
    </>
  ),
  "phu-kien-cong-thai-hoc": (
    <>
      <path d="M8 26c0-5 4-9 9-9h6c5 0 9 4 9 9v4H8z" />
      <path d="M14 17V9a3 3 0 0 1 6 0v8" />
    </>
  ),
  soundcard: (
    <>
      <rect x="5" y="12" width="30" height="18" rx="3" />
      <circle cx="13" cy="21" r="3" />
      <circle cx="22" cy="21" r="3" />
      <path d="M28 18v6M31 18v6" />
    </>
  ),
};

const DEFAULT_PATH = (
  <>
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <rect x="23" y="7" width="10" height="10" rx="2" />
    <rect x="7" y="23" width="10" height="10" rx="2" />
    <rect x="23" y="23" width="10" height="10" rx="2" />
  </>
);

export function CategoryArt({
  slug,
  className = "",
}: {
  slug?: string | null;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[slug ?? ""] ?? DEFAULT_PATH}
    </svg>
  );
}

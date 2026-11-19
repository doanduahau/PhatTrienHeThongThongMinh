export const money = (value: number | string | null | undefined) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)}đ`;

export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã huỷ",
};

/** Trả về URL ảnh hợp lệ từ business service; null nếu thiếu hoặc sai định dạng. */
export const resolveImage = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? url
      : null;
  } catch {
    return null;
  }
};

export const colorLabel = (value: string | null | undefined) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const key = text.toLowerCase().normalize("NFC");
  const hasBlack = key.includes("đen") || key.includes("den");
  const hasRed = key.includes("đỏ") || key.includes("do");
  if (hasBlack && hasRed)
    return { label: text, css: "linear-gradient(135deg, #111 50%, #d92d20 50%)" };
  if (hasBlack) return { label: text, css: "#111" };
  if (hasRed) return { label: text, css: "#d92d20" };
  if (key.includes("trắng") || key.includes("trang"))
    return { label: text, css: "#fff" };
  if (key.includes("xanh")) return { label: text, css: "#2f5bea" };
  return { label: text, css: "#8e8e93" };
};

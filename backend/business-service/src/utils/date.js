import { env } from "../config/env.js";

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: env.appTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const toParts = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
};

/** Ngày hiển thị cho người dùng Việt Nam: DD/MM/YYYY. */
export const formatDate = (value) => {
  const parts = toParts(value);
  return parts ? `${parts.day}/${parts.month}/${parts.year}` : null;
};

/** Kỳ tháng hiển thị cho người dùng: MM/YYYY. */
export const formatMonthYear = (value) => {
  const parts = toParts(value);
  return parts ? `${parts.month}/${parts.year}` : null;
};

/** Khoá kỳ cho API/biểu đồ: YYYY-MM-DD, giữ ISO để client sắp xếp được. */
export const formatIsoDate = (value) => {
  const parts = toParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : null;
};

/* ------------------- Biên ngày theo APP_TIME_ZONE ------------------- */

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const zonedParts = new Intl.DateTimeFormat("en-US", {
  timeZone: env.appTimeZone,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Độ lệch (ms) giữa giờ địa phương ở APP_TIME_ZONE và UTC tại một thời điểm. */
const offsetMsAt = (instant) => {
  const parts = Object.fromEntries(
    zonedParts.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
};

/** Đổi giờ địa phương (đã tách khỏi múi giờ) sang mốc UTC tương ứng. */
const zonedTimeToUtc = ({ year, month, day, hour = 0, minute = 0, second = 0 }) => {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = offsetMsAt(new Date(utcGuess));
  const instant = utcGuess - firstOffset;
  // Qua ranh giới DST, offset tại mốc thật có thể khác → hiệu chỉnh một lần.
  const secondOffset = offsetMsAt(new Date(instant));
  return new Date(secondOffset === firstOffset ? instant : utcGuess - secondOffset);
};

/**
 * Mốc 00:00:00 của ngày `YYYY-MM-DD` theo APP_TIME_ZONE (dùng cho filter `from`).
 * Chuỗi có kèm giờ được hiểu như `new Date(value)`.
 */
export const startOfDayInAppTz = (value) => {
  const text = String(value ?? "");
  if (!ISO_DATE_ONLY.test(text)) return new Date(value);
  const [year, month, day] = text.split("-").map(Number);
  return zonedTimeToUtc({ year, month, day });
};

/**
 * Mốc 23:59:59.999 của ngày `YYYY-MM-DD` theo APP_TIME_ZONE (dùng cho filter `to`).
 * Tránh `<= new Date("YYYY-MM-DD")` (00:00) cắt mất gần hết đơn của chính ngày đó.
 */
export const endOfDayInAppTz = (value) => {
  const text = String(value ?? "");
  if (!ISO_DATE_ONLY.test(text)) return new Date(value);
  const [year, month, day] = text.split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  const nextStart = zonedTimeToUtc({
    year: nextDay.getUTCFullYear(),
    month: nextDay.getUTCMonth() + 1,
    day: nextDay.getUTCDate(),
  });
  return new Date(nextStart.getTime() - 1);
};
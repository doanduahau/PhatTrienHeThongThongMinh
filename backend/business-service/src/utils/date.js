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
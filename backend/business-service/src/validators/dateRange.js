import { z } from "zod";

const dateOnly = z.string().trim().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.getUTCFullYear() >= 1000
    && date.toISOString().slice(0, 10) === value;
}, "Ngày không hợp lệ, cần ngày thực theo định dạng YYYY-MM-DD!");

export const dateRangeFields = { from: dateOnly.optional(), to: dateOnly.optional() };

export const validateDateRange = ({ from, to }, ctx) => {
  if (from && to && from > to) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["to"], message: "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu!" });
  }
};

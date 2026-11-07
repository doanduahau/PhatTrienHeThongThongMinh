import { Prisma } from "@prisma/client";

/** Chuyển mọi Prisma.Decimal trong object/array sang number để client dùng trực tiếp */
export const serializeDecimals = (value) => {
  if (value === null || value === undefined) return value;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(serializeDecimals);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeDecimals(item)]),
    );
  }
  return value;
};

export const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  return Number(value);
};

/** Làm tròn 2 chữ số thập phân cho tiền tệ */
export const roundMoney = (value) => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

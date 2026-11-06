export const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  return Number(value);
};

/** Làm tròn 2 chữ số thập phân cho tiền tệ */
export const roundMoney = (value) => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

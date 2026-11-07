import { env } from "../config/env.js";
import { PAYMENT_METHOD } from "../utils/constants.js";

export const getPaymentInfo = () => {
  const hasBank = Boolean(env.bankName && env.bankAccount && env.bankHolder);
  return {
    methods: Object.values(PAYMENT_METHOD),
    bank: hasBank
      ? { name: env.bankName, account: env.bankAccount, holder: env.bankHolder }
      : null,
  };
};
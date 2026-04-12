import { publishToDebt, publishToRepayment } from "./queue.js";
const ROUTING_KEYS = {
  DEBT_CREATED: "debt.created",
  DEBT_CONFIRMED: "debt.confirmed",
  DEBT_DISPUTED: "debt.disputed",
  DEBT_SETTLED: "debt.settled",
  DEBT_CANCELLED: "debt.cancelled",
  REPAYMENT_CREATED: "repayment.created",
  REPAYMENT_CONFIRMED: "repayment.confirmed",
  REPAYMENT_DISPUTED: "repayment.disputed",
};

export const publishDebtCreated = (payload) =>
  publishToDebt(ROUTING_KEYS.DEBT_CREATED, payload);

export const publishDebtConfirmed = (payload) =>
  publishToDebt(ROUTING_KEYS.DEBT_CONFIRMED, payload);

export const publishDebtDisputed = (payload) =>
  publishToDebt(ROUTING_KEYS.DEBT_DISPUTED, payload);

export const publishDebtSettled = (payload) =>
  publishToDebt(ROUTING_KEYS.DEBT_SETTLED, payload);

export const publishRepaymentCreated = (payload) =>
  publishToRepayment(ROUTING_KEYS.REPAYMENT_CREATED, payload);

export const publishRepaymentConfirmed = (payload) =>
  publishToRepayment(ROUTING_KEYS.REPAYMENT_CONFIRMED, payload);

export const publishRepaymentDisputed = (payload) =>
  publishToRepayment(ROUTING_KEYS.REPAYMENT_DISPUTED, payload);

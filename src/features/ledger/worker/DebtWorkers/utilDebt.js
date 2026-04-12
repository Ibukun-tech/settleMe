import logger from "../../../../common/logger/logger.js";

export const formatAmount = (amount) => {
  if (!amount || isNaN(Number(amount))) {
    throw new Error("Invalid amount");
  }
  return (
    "₦" +
    new Intl.NumberFormat("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount))
  );
};
export const deadLetter = (channel, msg, reason, payload) => {
  channel.nack(msg, false, false); // Reject the message without requeueing
  logger.warn({ reason, payload }, "consumer: dead-lettered message");
};

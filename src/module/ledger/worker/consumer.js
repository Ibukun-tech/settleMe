import logger from "../../../common/logger/logger.js";
import { channel } from "../../../common/infrastructure/queue.js";
import handeleDebtCreated from "./DebtWorkers/handleDebt.js";
import handleDebtConfirmed from "./DebtWorkers/confirmDebt.js";
import handleDebtDisputed from "./DebtWorkers/disputeDebt.js";
import handleDebtSettled from "./DebtWorkers/settleDebt.js";
import handleRepaymentConfirm from "./repaymentWorker/repaymentConfirm.js";
const Handlers = {
  "debt.created": handeleDebtCreated,
  "debt.confirmed": handleDebtConfirmed,
  "debt.disputed": handleDebtDisputed,
  "debt.settled": handleDebtSettled,
  "repayment.confirmed": handleRepaymentConfirm,
};

const handleMessage = async (msg, channel) => {
  const routingKey = msg.fields.routingKey;
  const handler = Handlers[routingKey];
  if (!handler) {
    logger.warn({ routingKey }, "consumer: no handler for routing key");
    return channel.ack(msg);
  }
  return await handler(msg, channel);
};

export const startConsumer = async () => {
  channel.prefetch(1);
  await channel.consume("debt_events", async (msg) => {
    try {
      await handleMessage(msg, channel);
      logger.info("consumer: listening on debt_events queue");
    } catch (err) {
      logger.error({ err }, "consumer: failed to start");
    }
  });
};

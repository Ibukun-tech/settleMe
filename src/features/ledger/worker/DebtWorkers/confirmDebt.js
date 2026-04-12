import logger from "../../../../common/logger/logger.js";
import { formatAmount, deadLetter } from "./utilDebt.js";
import debtRepository from "../../../repository/debt.repository.js";
import userRepository from "../../../repository/user.repository.js";
import notificationRepository from "../../../repository/notification.repository.js";
import { DEBT_STATUS } from "../../../commonFeature/index.js";
import {
  NOTIFICATION_REFERENCE_TYPE,
  NOTIFICATION_TYPE,
} from "../../../commonFeature/notification.enum.js";
const handleDebtConfirmed = async (msg, channel) => {
  if (!msg) {
    logger.warn(
      "consumer: received null message — consumer may have been cancelled",
    );
    return;
  }
  if (!msg.content || msg.content.length === 0) {
    logger.warn("consumer: received empty message content");
    return deadLetter(channel, msg, "empty message content", null);
  }
  let payload;
  try {
    payload = JSON.parse(msg.content.toString());
  } catch {
    return deadLetter(
      channel,
      msg,
      "malformed JSON payload",
      msg.content.toString(),
    );
  }
  const { debt_id, lender_profile_id, borrower_first_name, amount } = payload;
  if (!debt_id || !lender_profile_id || !borrower_first_name || !amount) {
    return deadLetter(channel, msg, "missing required fields", payload);
  }
  const debt = await debtRepository.findById(debt_id);
  if (!debt) {
    logger.info(
      { debt_id },
      "consumer: debt no longer exists, skipping notification",
    );
    return channel.ack(msg);
  }
  if (debt.status !== DEBT_STATUS.ACTIVE) {
    logger.info(
      { debt_id, status: debt.status },
      "consumer: debt is no longer in ACTIVE state, skipping notification",
    );
    return channel.ack(msg);
  }
  const lenderProfile = await userRepository.findProfileById(lender_profile_id);
  if (!lenderProfile) {
    logger.info(
      { lender_profile_id },
      "consumer: lender profile no longer exists, skipping notification",
    );
    return channel.ack(msg);
  }
  if (debt.lender_id === debt.borrower_id) {
    return deadLetter(
      channel,
      msg,
      "lender and borrower are the same profile",
      payload,
    );
  }
  const existing = await notificationRepository.findByReferenceAndType(
    lender_profile_id,
    debt_id,
    NOTIFICATION_TYPE.DEBT_CONFIRMED,
  );
  if (existing) {
    logger.info(
      { debt_id },
      "consumer: duplicate message, notification already created, skipping",
    );
    return channel.ack(msg);
  }

  let formattedAmount;
  try {
    formattedAmount = formatAmount(amount);
  } catch {
    return deadLetter(channel, msg, "invalid amount in payload", payload);
  }

  const message = `${borrower_first_name} has confirmed the debt of ${formattedAmount}. The debt is now active.`;
  const notificationData = {
    profile_id: lender_profile_id,
    type: NOTIFICATION_TYPE.DEBT_CONFIRMED,
    message,
    reference_id: debt_id,
    reference_type: NOTIFICATION_REFERENCE_TYPE.DEBT,
    is_read: false,
  };
  try {
    await notificationRepository.storeSingleNotification(notificationData);
    channel.ack(msg);
    logger.info(
      { debt_id },
      "consumer: debt.confirmed notification written and message acked",
    );
  } catch (error) {
    logger.error({ err, debt_id }, "consumer: max retries exhausted");
    return deadLetter(
      channel,
      msg,
      "database write failed after max retries",
      payload,
    );
  }
};

export default handleDebtConfirmed;

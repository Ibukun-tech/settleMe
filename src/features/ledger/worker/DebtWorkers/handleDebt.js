import logger from "../../../../common/logger/logger.js";

import debtRepository from "../../../repository/debt.repository.js";
import userRepository from "../../../repository/user.repository.js";
import notificationRepository from "../../../repository/notification.repository.js";
import {
  NOTIFICATION_REFERENCE_TYPE,
  NOTIFICATION_TYPE,
} from "../../../commonFeature/notification.enum.js";
import { formatAmount, deadLetter } from "./utilDebt.js";

const buildBorrowerMessage = (lenderName, formattedAmount, dueDate) => {
  const base = `${lenderName} has recorded a debt of ${formattedAmount} against you`;
  if (dueDate) {
    const formatted = new Date(dueDate).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${base}, due by ${formatted}. Please confirm or dispute.`;
  }
  return `${base}. Please confirm or dispute.`;
};

const buildLenderMessage = (borrowerName, formattedAmount, dueDate) => {
  return `Your debt of ${formattedAmount} against ${borrowerName} has been recorded and is awaiting confirmation.`;
};

const handeleDebtCreated = async (msg, channel) => {
  if (!msg) {
    logger.warn(
      "consumer: received null message — consumer may have been cancelled",
    );
    return;
  }
  if (!msg.content || msg.content.length === 0) {
    logger.warn("consumer: received empty message content");
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
  const {
    debt_id,
    lender_profile_id,
    lender_first_name,
    borrower_profile_id,
    amount,
    due_date,
  } = payload;
  if (
    !debt_id ||
    !lender_profile_id ||
    !lender_first_name ||
    !borrower_profile_id ||
    !amount
  ) {
    return deadLetter(channel, msg, "missing required fields", payload);
  }
  const debt = await debtRepository.findByDebtId(debt_id);

  if (!debt) {
    logger.info(
      { debt_id },
      "consumer: debt no longer exists, skipping notification",
    );
    return channel.ack(msg);
  }

  const borrowerProfile =
    await userRepository.findProfileById(borrower_profile_id);

  if (!borrowerProfile) {
    logger.info(
      { borrower_profile_id },
      "consumer: borrower profile no longer exists, skipping notification",
    );
    return channel.ack(msg);
  }
  // check if notification already exists for this debt and borrower
  const existing = await notificationRepository.findByReferenceAndType(
    borrower_profile_id,
    debt_id,
    NOTIFICATION_TYPE.DEBT_CREATED,
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
  } catch (error) {
    logger.warn(
      { error, amount },
      "consumer: invalid amount, skipping notification",
    );
    return deadLetter(channel, msg, "invalid amount", payload);
  }
  const borrowerMessage = buildBorrowerMessage(
    borrowerProfile?.first_name,
    formattedAmount,
    due_date ?? null,
  );
  const lenderMessage = buildLenderMessage(formattedAmount, lender_first_name);

  // save to the notification table
  const borrowerData = {
    profile_id: borrowerProfile.id,
    type: NOTIFICATION_TYPE.DEBT_CREATED,
    message: borrowerMessage,
    reference_id: debt_id,
    reference_type: NOTIFICATION_REFERENCE_TYPE.DEBT,
    is_read: false,
  };

  const lenderData = {
    profile_id: lender_profile_id,
    type: NOTIFICATION_TYPE.DEBT_CREATED,
    message: lenderMessage,
    reference_id: debt_id,
    reference_type: NOTIFICATION_REFERENCE_TYPE.DEBT,
    is_read: false,
  };
  try {
    await notificationRepository.storeNotifications(borrowerData, lenderData);
    channel.ack(msg);
    logger.info(
      { debt_id },
      "consumer: debt.created notifications written and message acked",
    );
  } catch (err) {
    logger.error({ err }, "consumer: failed to store notifications");
  }
};
export default handeleDebtCreated;

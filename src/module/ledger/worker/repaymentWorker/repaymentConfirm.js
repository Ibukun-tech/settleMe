import logger from "../../../../common/logger/logger.js";
import { deadLetter } from "../DebtWorkers/utilDebt.js";
import debtRepository from "../../repository/debt.repository.js";
import repaymentRepository from "../../repository/repayment.repository.js";
import { REPAYMENT_STATUS } from "../../enum/repayment.enum.js";
import userRepository from "../../../user/repository/user.repository.js";
import { formatAmount } from "../DebtWorkers/utilDebt.js";
import { NOTIFICATION_TYPE } from "../../../commonFeature/notification.enum.js";
import notificationRepository from "../../../repository/notification.repository.js";
const repaymentConfirm = async (msg, channel) => {
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
  if (
    !debt_id ||
    !repayment_id ||
    !lender_first_name ||
    !borrower_profile_id ||
    !amount_paid ||
    !remaining_balance
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
  const repaymentExist = await repaymentRepository.findById(repayment_id);
  if (!repaymentExist) {
    logger.info(
      { debt_id },
      "consumer: repayment  no longer exists, skipping notification",
    );
    return channel.ack(msg);
  }
  if (repaymentExist.status !== REPAYMENT_STATUS.CONFIRMED) {
    logger.info(
      { debt_id },
      "consumer: repayment has not been confirmed, skipping notification",
    );
    return channel.ack(msg);
  }
  if (repaymentExist.debt_id !== debt_id) {
    logger.info(
      { debt_id },
      "consumer: this repayment is not for this debit, skipping notification",
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

  const ifThisNotificationExist =
    await notificationRepository.findByReferenceAndType(
      borrower_profile_id,
      repayment_id,
      NOTIFICATION_TYPE.REPAYMENT_CONFIRMED,
    );
  if (ifThisNotificationExist) {
    logger.info(
      { repayment_id },
      "consumer: duplicate message, notification already created, skipping",
    );
    return channel.ack(msg);
  }
  const remaininGBalance =
    await repaymentRepository.sumConfirmedByDebitIdWithoutTransaction(debt_id);

  if (parseFloat(remaininGBalance) !== remaining_balance) {
    logger.info(
      { repayment_id },
      "consumer: remaining balance in message does not match calculated remaining balance, skipping notification",
    );
  }
  const formattedAmount = formatAmount(amount_paid);
  let message;
  if (remaininGBalance === 0) {
    message`${lender_first_name} has confirmed your repayment of ${formattedAmount}. Your final payment has been acknowledged.`;
  } else if (remaininGBalance > 0) {
    message = `${lender_first_name} has confirmed your repayment of ${formattedAmount}. Your remaining balance is ₦${formatAmount(remaininGBalance)}`;
  } else {
    message = "your repayment has been confirmed";
  }
  const notificationData = {
    profile_id: borrower_profile_id,
    type: NOTIFICATION_TYPE.REPAYMENT_CONFIRMED,
    message,
    reference_id: repayment_id,
    reference_type: NOTIFICATION_REFERENCE_TYPE.REPAYMENT,
    is_read: false,
  };
  try {
    await notificationRepository.createWithoutTransaction(notificationData);
    channel.ack(msg);
    logger.info(
      { repayment_id },
      "consumer: repayment.confirmed notification written and message acked",
    );
  } catch (err) {
    logger.error({ err, repayment_id }, "consumer: max retries exhausted");
    return deadLetter(
      channel,
      msg,
      "database error when creating notification",
      payload,
    );
  }
};
export default repaymentConfirm;

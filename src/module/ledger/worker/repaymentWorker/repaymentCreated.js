import logger from "../../../../common/logger/logger.js";
import { deadLetter } from "../DebtWorkers/utilDebt.js";
import debtRepository from "../../repository/debt.repository.js";
import repaymentRepository from "../../repository/repayment.repository.js";
import { REPAYMENT_STATUS } from "../../enum/repayment.enum.js";
import userRepository from "../../../user/repository/user.repository.js";
import { formatAmount } from "../DebtWorkers/utilDebt.js";
import { NOTIFICATION_TYPE } from "../../../commonFeature/notification.enum.js";
import notificationRepository from "../../../repository/notification.repository.js";
import { channel } from "../../../../common/infrastructure/queue.js";
import { DEBT_STATUS } from "../../enum/debt.enum.js";

const repaymentCreated = async (msg, channel) => {
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

  const {
    debt_id,
    repayment_id,
    lender_profile_id,
    borrower_first_name,
    amount_paid,
    remaining_balance,
  } = payload;

  if (
    !debt_id ||
    !repayment_id ||
    !lender_profile_id ||
    !borrower_first_name ||
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
  if (debt.status === DEBT_STATUS.SETTLED) {
    logger.error(
      { debt_id },
      "consumer: repayment created on a settled debt — data integrity issue",
    );
    return deadLetter(
      channel,
      msg,
      "repayment created on a settled debt, data integrity issue",
      payload,
    );
  }
  if (![DEBT_STATUS.ACTIVE, DEBT_STATUS.PARTIALLY_PAID].includes(debt.status)) {
    logger.info(
      { debt_id, status: debt.status },
      "consumer: debt is not in a valid state for repayment notification, skipping",
    );
    return channel.ack(msg);
  }
  if (debt.status === DEBT_STATUS.DISPUTED) {
    logger.warn(
      { debt_id },
      "consumer: repayment logged against a disputed debt — notifying lender anyway",
    );
  }
  const repaymentExist = await repaymentRepository.findById(repayment_id);
  if (!repaymentExist) {
    logger.info(
      { repayment_id },
      "consumer: repayment no longer exists, skipping notification",
    );
    return channel.ack(msg);
  }
  if (repaymentExist.status !== REPAYMENT_STATUS.PENDING_CONFIRMATION) {
    logger.info(
      { repayment_id, status: repaymentExist.status },
      "consumer: repayment already actioned, skipping notification",
    );
    return channel.ack(msg);
  }

  if (repaymentExist.debt_id !== debt_id) {
    logger.error(
      { repayment_id, debt_id },
      "consumer: repayment does not belong to this debt — data integrity issue",
    );
    return deadLetter(
      channel,
      msg,
      "repayment does not belong to this debt",
      payload,
    );
  }
  const lenderProfile = await userRepository.findProfileById(lender_profile_id);
  if (!lenderProfile) {
    logger.info(
      { lender_profile_id },
      "consumer: lender profile no longer exists, skipping notification",
    );
    return channel.ack(msg);
  }
  const existing = await notificationRepository.findByReferenceAndType(
    lender_profile_id,
    repayment_id,
    NOTIFICATION_TYPE.REPAYMENT_CREATED,
  );
  if (existing) {
    logger.info(
      { repayment_id },
      "consumer: duplicate message, notification already created, skipping",
    );
    return channel.ack(msg);
  }
  const confirmedSum =
    await repaymentRepository.sumConfirmedByDebitIdWithoutTransaction(debt_id);
  const calculatedRemaining =
    parseFloat(debt.amount) - parseFloat(confirmedSum);

  if (calculatedRemaining < 0) {
    logger.error(
      { debt_id, calculatedRemaining },
      "consumer: remaining balance is negative — data integrity issue",
    );
    return deadLetter(
      channel,
      msg,
      "remaining balance is negative, data integrity issue",
      payload,
    );
  }
  if (parseFloat(remaining_balance) !== calculatedRemaining) {
    logger.warn(
      {
        repayment_id,
        payload_remaining: remaining_balance,
        calculatedRemaining,
      },
      "consumer: payload remaining_balance does not match database calculated value — using database value",
    );
  }
  if (parseFloat(amount_paid) > calculatedRemaining) {
    logger.error(
      { repayment_id, amount_paid, calculatedRemaining },
      "consumer: repayment amount exceeds remaining balance — data integrity issue",
    );
    // There is an edge case here what if the amount paid is more than the remaining balance but  there is stil remaining  balance which the amount being created can cover and the remaining money that is more than the remaining balance can be stored somewhere like a ledger and we can track it to the person who repaid more so we can then check if it was him that paid more
    //     11:28 AMGood. So you've just made two decisions:

    // When overpayment happens — split the payment, cover the debt, write the excess to user_credits
    // Status changes — credit starts as pending, flips to confirmed when the lender confirms the repayment
    return deadLetter(
      channel,
      msg,
      "repayment amount exceeds remaining balance, data integrity issue",
      payload,
    );
  }
  let formattedAmountPaid;
  try {
    formattedAmountPaid = formatAmount(amount_paid);
  } catch {
    return deadLetter(channel, msg, "invalid amount_paid in payload", payload);
  }

  let message;
  const isFinalPayment = parseFloat(amount_paid) >= calculatedRemaining;
  if (isFinalPayment) {
    message = `${safeName} has logged a repayment of ${formattedAmountPaid} which would fully settle the debt.\nPlease confirm or dispute.`;
  } else {
    message = `${safeName} has logged a repayment of ${formattedAmountPaid}.\nRemaining balance: ${formattedRemaining}. Please confirm or dispute.`;
  }
  const notificationData = {
    profile_id: lender_profile_id,
    type: NOTIFICATION_TYPE.REPAYMENT_CREATED,
    message,
    reference_id: repayment_id,
    reference_type: NOTIFICATION_REFERENCE_TYPE.REPAYMENT,
    is_read: false,
  };
  try {
    await notificationRepository.storeSingleNotification(notificationData);
    channel.ack(msg);
    logger.info(
      { repayment_id },
      "consumer: repayment.created notification written and message acked",
    );
  } catch (err) {
    logger.error({ err, repayment_id }, "consumer: database write failed ");
    return deadLetter(channel, msg, "database write failed", payload);
  }
};
export default repaymentCreated;

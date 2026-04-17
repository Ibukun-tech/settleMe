import logger from "../../../../common/logger/logger.js";
import { deadLetter } from "../DebtWorkers/utilDebt.js";
import debtRepository from "../../repository/debt.repository.js";
import repaymentRepository from "../../repository/repayment.repository.js";
import { REPAYMENT_STATUS } from "../../enum/repayment.enum.js";
import { DEBT_STATUS } from "../../enum/debt.enum.js";
import userRepository from "../../../user/repository/user.repository.js";
import { formatAmount } from "../DebtWorkers/utilDebt.js";
import { NOTIFICATION_TYPE } from "../../../commonFeature/notification.enum.js";
import notificationRepository from "../../../repository/notification.repository.js";

const repaymentDisputed = async (msg, channel) => {
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
  const debt = await debtRepository.findByDebtId(debt_id);
  if (!debt) {
    logger.info(
      { debt_id },
      "consumer: debt no longer exists, skipping notification",
    );
    return channel.ack(msg);
  }
  switch (debt.status) {
    case DEBT_STATUS.SETTLED:
      logger.error(
        { debt_id },
        "consumer: debt is SETTLED but repayment was disputed — data integrity issue",
      );
      return deadLetter(
        channel,
        msg,
        "debt is SETTLED but repayment was disputed, data integrity issue",
        payload,
      );

    case DEBT_STATUS.PENDING_CONFIRMATION:
      logger.error(
        { debt_id },
        "consumer: debt in PENDING_CONFIRMATION but repayment was disputed — data integrity issue",
      );
      return deadLetter(
        channel,
        msg,
        "debt in PENDING_CONFIRMATION but repayment was disputed, data integrity issue",
        payload,
      );

    case DEBT_STATUS.PARTIALLY_PAID:
      logger.warn(
        { debt_id },
        "consumer: debt is PARTIALLY_PAID after repayment dispute — service layer did not revert status correctly",
      );
      break;

    case DEBT_STATUS.DISPUTED:
      logger.warn(
        { debt_id },
        "consumer: entire debt is also DISPUTED — notifying both parties about this specific repayment dispute",
      );
      break;
  }
  const repaymentExist = await repaymentRepository.findById(repayment_id);
  if (!repaymentExist) {
    logger.info(
      { repayment_id },
      "consumer: repayment no longer exists, skipping notification",
    );
    return channel.ack(msg);
  }
  if (repaymentExist.status !== REPAYMENT_STATUS.DISPUTED) {
    logger.info(
      { repayment_id, status: repaymentExist.status },
      "consumer: repayment is no longer in DISPUTED state, skipping notification",
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
  if (debt.lender_id !== lender_profile_id) {
    logger.error(
      { lender_profile_id, actual_lender: debt.lender_id },
      "consumer: non-lender attempted to dispute repayment — data integrity issue",
    );
    return deadLetter(
      channel,
      msg,
      "non-lender attempted to dispute repayment",
      payload,
    );
  }
  const [lenderProfile, borrowerProfile] = await Promise.all([
    userRepository.findProfileById(lender_profile_id),
    userRepository.findProfileById(borrower_profile_id),
  ]);
  if (!lenderProfile) {
    logger.info(
      { lender_profile_id },
      "consumer: lender profile no longer exists, skipping lender notification",
    );
  }

  if (!borrowerProfile) {
    logger.info(
      { borrower_profile_id },
      "consumer: borrower profile no longer exists, skipping borrower notification",
    );
  }
  if (!lenderProfile && !borrowerProfile) {
    logger.info(
      { debt_id, repayment_id },
      "consumer: both profiles no longer exist, skipping all notifications",
    );
    return channel.ack(msg);
  }
  const [lenderNotifExists, borrowerNotifExists] = await Promise.all([
    lenderProfile
      ? notificationRepository.findByReferenceAndType(
          lender_profile_id,
          repayment_id,
          NOTIFICATION_TYPE.REPAYMENT_DISPUTED,
        )
      : Promise.resolve(true), // treat as "skip" if profile gone
    borrowerProfile
      ? notificationRepository.findByReferenceAndType(
          borrower_profile_id,
          repayment_id,
          NOTIFICATION_TYPE.REPAYMENT_DISPUTED,
        )
      : Promise.resolve(true),
  ]);
  const dbAmount = parseFloat(repaymentExist.amount);
  if (parseFloat(amount) !== dbAmount) {
    logger.warn(
      { repayment_id, payload_amount: amount, db_amount: dbAmount },
      "consumer: payload amount does not match database repayment amount — using database value",
    );
  }
  if (dbAmount > parseFloat(debt.amount)) {
    logger.error(
      { repayment_id, dbAmount, debt_amount: debt.amount },
      "consumer: repayment amount exceeds debt amount — data integrity issue",
    );
    return deadLetter(
      channel,
      msg,
      "repayment amount exceeds debt amount, data integrity issue",
      payload,
    );
  }
  let formattedAmount;
  try {
    formattedAmount = formatAmount(dbAmount);
  } catch {
    return deadLetter(channel, msg, "invalid amount in payload", payload);
  }
  const lenderMessage = `you have disputed ${borrowerProfile?.first_name}'s repayment of ${formattedAmount}  ${borrowerProfile?.first_name} has been notified`;
  const borrowerMessage = `${lenderProfile?.first_name} has disputed your repayment of ${formattedAmount}  Please resolve this with ${lenderProfile?.first_name} directly`;
  const notificationsToCreate = [
    {
      profile_id: lender_profile_id,
      type: NOTIFICATION_TYPE.REPAYMENT_DISPUTED,
      message: lenderMessage,
      reference_id: repayment_id,
      reference_type: NOTIFICATION_REFERENCE_TYPE.REPAYMENT,
      is_read: false,
    },
    {
      profile_id: borrower_profile_id,
      type: NOTIFICATION_TYPE.REPAYMENT_DISPUTED,
      message: borrowerMessage,
      reference_id: repayment_id,
      reference_type: NOTIFICATION_REFERENCE_TYPE.REPAYMENT,
      is_read: false,
    },
  ];
  try {
    await notificationRepository.bulkCreate(notificationsToCreate);
    channel.ack(msg);
    logger.info(
      { repayment_id },
      "consumer: repayment.disputed notifications written and message acked",
    );
  } catch (err) {
    logger.error({ err, repayment_id }, "consumer: database write failed ");
    return deadLetter(channel, msg, "database write failed after ", payload);
  }
};

export default repaymentDisputed;

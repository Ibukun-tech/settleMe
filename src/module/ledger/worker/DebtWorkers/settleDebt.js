import logger from "../../../../common/logger/logger.js";
import { formatAmount, deadLetter } from "./utilDebt.js";
import debtRepository from "../../repository/debt.repository.js";
import repaymentRepository from "../../repository/repayment.repository.js";
import userRepository from "../../../user/repository/user.repository.js";
import notificationRepository from "../../../repository/notification.repository.js";
import {
  NOTIFICATION_REFERENCE_TYPE,
  NOTIFICATION_TYPE,
} from "../../../commonFeature/notification.enum.js";
import { DEBT_STATUS } from "../../enum/debt.enum.js";
const handleDebtSettled = async (msg, channel) => {
  if (!msg) {
    logger.warn(
      "consumer: received null message — consumer may have been cancelled",
    );
    return;
  }
  if (!msg.content || msg.content.length === 0) {
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
    lender_profile_id,
    lender_first_name,
    borrower_profile_id,
    borrower_first_name,
    total_amount,
  } = payload;

  if (
    !debt_id ||
    !lender_profile_id ||
    !lender_first_name ||
    !borrower_profile_id ||
    !borrower_first_name ||
    !total_amount
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
  if (debt.status !== DEBT_STATUS.SETTLED) {
    logger.info(
      { debt_id, status: debt.status },
      "consumer: debt is no longer in SETTLED state, skipping notification",
    );
    return channel.ack(msg);
  }
  const totalPaid = await repaymentRepository.sumConfirmedByDebtId(debt_id);
  const remaining = parseFloat(debt.amount) - parseFloat(totalPaid);
  if (remaining > 0) {
    logger.error(
      { debt_id, remaining, debtAmount: debt.amount, totalPaid },
      "consumer: CRITICAL — debt marked as SETTLED but remaining balance is not zero",
    );
    return deadLetter(
      channel,
      msg,
      "debt marked as SETTLED but remaining balance is not zero",
      payload,
    );
  }
  const [lenderProfile, borrowerProfile] = await Promise.all([
    userRepository.findProfileById(lender_profile_id),
    userRepository.findProfileById(borrower_profile_id),
  ]);
  const notifyLender = !!lenderProfile;
  const notifyBorrower = !!borrowerProfile;

  if (!notifyLender && !notifyBorrower) {
    logger.info(
      { debt_id },
      "consumer: both profiles no longer exist, skipping all notifications",
    );
    return channel.ack(msg);
  }
  const [lenderExisting, borrowerExisting] = await Promise.all([
    notifyLender
      ? notificationRepository.findByReferenceAndType(
          lender_profile_id,
          debt_id,
          NOTIFICATION_TYPE.DEBT_SETTLED,
        )
      : null,
    notifyBorrower
      ? notificationRepository.findByReferenceAndType(
          borrower_profile_id,
          debt_id,
          NOTIFICATION_TYPE.DEBT_SETTLED,
        )
      : null,
  ]);
  const dbAmount = parseFloat(debt.amount);
  const payloadAmount = parseFloat(total_amount);
  if (dbAmount !== payloadAmount) {
    logger.warn(
      { debt_id, dbAmount, payloadAmount },
      "consumer: payload total_amount differs from debt.amount in DB — using DB value",
    );
  }
  const numericAmount = dbAmount;
  if (!numericAmount || numericAmount <= 0 || isNaN(numericAmount)) {
    return deadLetter(channel, msg, "invalid total_amount in payload", payload);
  }
  let formattedAmount;
  try {
    formattedAmount = formatAmount(debt.amount);
  } catch {
    return deadLetter(channel, msg, "invalid total_amount in payload", payload);
  }
  const lenderMessage = `${borrower_first_name} has fully settled the debt of ${formattedAmount}. Your money has been completely repaid.`;
  const borrowerMessage = `You have fully settled the debt of ${formattedAmount} with ${lender_first_name}. Well done!`;
  const rowsToInsert = [];

  if (notifyLender && !lenderAlreadyExists) {
    rowsToInsert.push({
      profile_id: lender_profile_id,
      type: NOTIFICATION_TYPE.DEBT_SETTLED,
      message: lenderMessage,
      reference_id: debt_id,
      reference_type: NOTIFICATION_REFERENCE_TYPE.DEBT,
      is_read: false,
    });
  }

  if (notifyBorrower && !borrowerAlreadyExists) {
    rowsToInsert.push({
      profile_id: borrower_profile_id,
      type: NOTIFICATION_TYPE.DEBT_SETTLED,
      message: borrowerMessage,
      reference_id: debt_id,
      reference_type: NOTIFICATION_REFERENCE_TYPE.DEBT,
      is_read: false,
    });
  }

  if (rowsToInsert.length === 0) {
    logger.info(
      { debt_id },
      "consumer: all notifications already exist, skipping",
    );
    return channel.ack(msg);
  }
  try {
    (await notificationRepository.storeBatch(rowsToInsert), channel.ack(msg));
    logger.info(
      { debt_id, rows: rowsToInsert.length },
      "consumer: debt.settled notifications written and message acked",
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
export default handleDebtSettled;

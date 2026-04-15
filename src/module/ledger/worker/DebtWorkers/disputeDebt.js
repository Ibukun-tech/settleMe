import logger from "../../../../common/logger/logger.js";
import { formatAmount, deadLetter } from "./utilDebt.js";
import debtRepository from "../../repository/debt.repository.js";
import userRepository from "../../../user/repository/user.repository.js";
import notificationRepository from "../../../repository/notification.repository.js";
import {
  NOTIFICATION_REFERENCE_TYPE,
  NOTIFICATION_TYPE,
} from "../../../commonFeature/notification.enum.js";
import { DEBT_STATUS } from "../../enum/debt.enum.js";

const handleDebtDisputed = async (msg, channel) => {
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
    disputed_by_profile_id,
    amount,
  } = payload;

  if (
    !debt_id ||
    !lender_profile_id ||
    !lender_first_name ||
    !borrower_profile_id ||
    !borrower_first_name ||
    !disputed_by_profile_id ||
    !amount
  ) {
    return deadLetter(channel, msg, "missing required fields", payload);
  }
  const lenderDisputed = disputed_by_profile_id === lender_profile_id;
  const borrowerDisputed = disputed_by_profile_id === borrower_profile_id;
  if (!lenderDisputed && !borrowerDisputed) {
    return deadLetter(
      channel,
      msg,
      "disputed_by is not a party to this debt",
      payload,
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
  if (debt.status !== DEBT_STATUS.DISPUTED) {
    logger.info(
      { debt_id, status: debt.status },
      "consumer: debt is no longer in DISPUTED state, skipping notification",
    );
    return channel.ack(msg);
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
  let formattedAmount;
  try {
    formattedAmount = formatAmount(amount);
  } catch {
    return deadLetter(channel, msg, "invalid amount in payload", payload);
  }
  let lenderMessage, borrowerMessage;
  // lender_first_name and borrower_first_name are optional in the payload, but if they are missing we can get them from the profiles
  if (lenderDisputed) {
    lenderMessage = `You have disputed the debt of ${formattedAmount} with ${borrower_first_name}.`;
    borrowerMessage = `${lender_first_name} has disputed the debt of ${formattedAmount}. Please resolve this.`;
  } else {
    lenderMessage = `${borrower_first_name} has disputed the debt of ${formattedAmount}. Please resolve this.`;
    borrowerMessage = `You have disputed the debt of ${formattedAmount} with ${lender_first_name}.`;
  }
  const [notifyLenderExist, notifyBorrowerExist] = await Promise.all([
    notifyLender
      ? notificationRepository.findByReferenceAndType(
          lender_profile_id,
          debt_id,
          NOTIFICATION_TYPE.DEBT_DISPUTED,
        )
      : null,
    notifyBorrower
      ? notificationRepository.findByReferenceAndType(
          borrower_profile_id,
          debt_id,
          NOTIFICATION_TYPE.DEBT_DISPUTED,
        )
      : null,
  ]);

  const lenderAlreadyExists = !!notifyLenderExist;
  const borrowerAlreadyExists = !!notifyBorrowerExist;

  // Steps 19–22 — build batch of rows to insert
  const rowsToInsert = [];

  if (notifyLender && !lenderAlreadyExists) {
    rowsToInsert.push({
      profile_id: lender_profile_id,
      type: NOTIFICATION_TYPE.DEBT_DISPUTED,
      message: lenderMessage,
      reference_id: debt_id,
      reference_type: NOTIFICATION_REFERENCE_TYPE.DEBT,
      is_read: false,
    });
  }

  if (notifyBorrower && !borrowerAlreadyExists) {
    rowsToInsert.push({
      profile_id: borrower_profile_id,
      type: NOTIFICATION_TYPE.DEBT_DISPUTED,
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
    await notificationRepository.storeBatch(rowsToInsert);
    channel.ack(msg);
    logger.info(
      { debt_id, rows: rowsToInsert.length },
      "consumer: debt.disputed notifications written and message acked",
    );
  } catch (err) {
    logger.error({ err, debt_id }, "consumer: max retries exhausted");
    return deadLetter(
      channel,
      msg,
      "database write failed after max retries",
      payload,
    );
  }
};
export default handleDebtDisputed;

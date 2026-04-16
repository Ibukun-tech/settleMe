import logger from "../../../../common/logger/logger.js";
import { deadLetter } from "../DebtWorkers/utilDebt.js";
import debtRepository from "../../repository/debt.repository.js";
import repaymentRepository from "../../repository/repayment.repository.js";
import { REPAYMENT_STATUS } from "../../enum/repayment.enum.js";
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
};

export default repaymentDisputed;

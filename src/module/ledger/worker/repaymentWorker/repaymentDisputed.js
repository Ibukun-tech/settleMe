import logger from "../../../../common/logger/logger.js";
import { deadLetter } from "../DebtWorkers/utilDebt.js";
import debtRepository from "../../repository/debt.repository.js";
import repaymentRepository from "../../repository/repayment.repository.js";
import { REPAYMENT_STATUS } from "../../enum/repayment.enum.js";
import userRepository from "../../../user/repository/user.repository.js";
import { formatAmount } from "../DebtWorkers/utilDebt.js";
import { NOTIFICATION_TYPE } from "../../../commonFeature/notification.enum.js";
import notificationRepository from "../../../repository/notification.repository.js";

const repaymentDisputed = async (msg, channel) => {};

export default repaymentDisputed;

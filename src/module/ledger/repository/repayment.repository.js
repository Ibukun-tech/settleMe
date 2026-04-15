import { Op } from "sequelize";
import { sequelize } from "../../../common/infrastructure/database.js";
import { REPAYMENT_STATUS, DEBT_STATUS } from "../enum/index.js";
import { models } from "../../entities/index.js";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "../../../common/middleware/error.js";
import debtRepository from "./debt.repository.js";
const { Debt, Profile, Repayment } = models;
class RepaymentRepository {
  constructor() {
    this.debtRepository = debtRepository;
  }
  async create(data, transaction) {
    return await Repayment.create(data, { transaction });
  }
  async findById(repaymentId) {
    return await Repayment.findByPk(repaymentId);
  }
  async findPendingByDebitId(debitId, transaction) {
    return await Repayment.findOne({
      where: {
        debt_id: debitId,
        status: REPAYMENT_STATUS.PENDING_CONFIRMATION,
      },
      transaction,
    });
  }
  async sumConfirmedByDebitIdWithoutTransaction(debitId) {
    const total = await Repayment.sum("amount", {
      where: { debt_id: debitId, status: REPAYMENT_STATUS.CONFIRMED },
    });
    return total ?? 0;
  }
  async sumConfirmedByDebtId(debtId, transaction) {
    const total = await Repayment.sum("amount", {
      where: { debt_id: debtId, status: REPAYMENT_STATUS.CONFIRMED },
      transaction,
    });
    return total ?? 0;
  }
  async RepaymentTransaction(debtId, profile) {
    return await sequelize.transaction(async (t) => {
      const debt = await this.debtRepository.findByIdWithLock(debtId, t);
      if (!debt) throw new NotFoundError("Debt not found");

      if (debt.borrower_id !== profile.id) {
        throw new ForbiddenError("Only the borrower can log a repayment");
      }

      if (debt.status === DEBT_STATUS.PENDING_CONFIRMATION) {
        throw new BadRequestError("Debt has not been confirmed yet");
      }
      if (debt.status === DEBT_STATUS.SETTLED) {
        throw new BadRequestError("This debt has already been fully settled");
      }
      if (debt.status === DEBT_STATUS.DISPUTED) {
        throw new BadRequestError("Cannot make a repayment on a disputed debt");
      }

      const pendingRepayment = await this.findPendingByDebtId(debtId, t);
      if (pendingRepayment) {
        throw new BadRequestError(
          "You have a repayment pending confirmation. Wait for the lender to respond before logging another",
        );
      }

      const totalPaid = await this.sumConfirmedByDebtId(debtId, t);
      const remaining = parseFloat(debt.amount) - parseFloat(totalPaid);

      if (amount > remaining) {
        throw new BadRequestError(
          `Repayment amount exceeds remaining balance of ₦${remaining.toFixed(2)}`,
        );
      }
      const newRepayment = await this.create(
        {
          debt_id: debtId,
          recorded_by: profile.id,
          amount,
          status: REPAYMENT_STATUS.PENDING_CONFIRMATION,
        },
        t,
      );

      if (debt.status === DEBT_STATUS.ACTIVE) {
        await this.debtRepository.updateStatus(
          debtId,
          DEBT_STATUS.PARTIALLY_PAID,
          t,
        );
      }

      return { repayment: newRepayment, remaining, debt };
    });
  }
  async findByIdTransaction(repaymentId, transaction) {
    return await Repayment.findByPk(repaymentId, { transaction });
  }
  async updateStatusTransaction(repaymentId, status, transaction) {
    const [affectedRows] = await Repayment.update(
      { status },
      { where: { id: repaymentId }, transaction },
    );
    return affectedRows > 0;
  }
  async confirmRepaymentTransaction(debtId, repaymentId, profile) {
    return await sequelize.transaction(async (t) => {
      const debt = await this.debtRepository.findByIdWithLock(debtId, t);
      if (!debt) throw new NotFoundError("Debt not found");

      if (debt.lender_id !== profile.id) {
        throw new ForbiddenError("Only the lender can confirm a repayment");
      }

      if (debt.status === DEBT_STATUS.DISPUTED) {
        throw new BadRequestError(
          "Cannot confirm a repayment on a disputed debt",
        );
      }
      if (debt.status === DEBT_STATUS.SETTLED) {
        throw new BadRequestError("This debt is already settled");
      }
      if (debt.status === DEBT_STATUS.PENDING_CONFIRMATION) {
        throw new BadRequestError("Debt has not been confirmed yet");
      }

      const repayment = await this.findById(repaymentId, t);
      if (!repayment) throw new NotFoundError("Repayment not found");

      if (repayment.debt_id !== debtId) {
        throw new BadRequestError(
          "This repayment does not belong to this debt",
        );
      }

      if (repayment.status === REPAYMENT_STATUS.CONFIRMED) {
        throw new BadRequestError("This repayment has already been confirmed");
      }
      if (repayment.status === REPAYMENT_STATUS.DISPUTED) {
        throw new BadRequestError(
          "This repayment has been disputed and cannot be confirmed",
        );
      }

      await this.updateStatusTransaction(
        repaymentId,
        REPAYMENT_STATUS.CONFIRMED,
        t,
      );

      const totalPaid = await this.sumConfirmedByDebtId(debtId, t);
      const remaining = parseFloat(debt.amount) - parseFloat(totalPaid);

      const isSettled = remaining <= 0;
      const newDebtStatus = isSettled
        ? DEBT_STATUS.SETTLED
        : DEBT_STATUS.PARTIALLY_PAID;
      await this.debtRepository.updateStatus(debtId, newDebtStatus, t);

      return { repayment, debt, remaining, isSettled, newDebtStatus };
    });
  }
  async disputeRepaymentTransaction(debtId, repaymentId, profile) {
    return await sequelize.transaction(async (t) => {
      const debt = await this.debtRepository.findByIdWithLock(debtId, t);
      if (!debt) throw new NotFoundError("Debt not found");

      if (debt.lender_id !== profile.id) {
        throw new ForbiddenError("Only the lender can dispute a repayment");
      }
      if (debt.status === DEBT_STATUS.SETTLED) {
        throw new BadRequestError(
          "Cannot dispute a repayment on a settled debt",
        );
      }
      if (debt.status === DEBT_STATUS.DISPUTED) {
        throw new BadRequestError("This debt is already disputed");
      }

      const repayment = await this.findByIdTransaction(repaymentId, t);
      if (!repayment) throw new NotFoundError("Repayment not found");

      if (repayment.debt_id !== debtId) {
        throw new BadRequestError(
          "This repayment does not belong to this debt",
        );
      }

      if (repayment.status === REPAYMENT_STATUS.CONFIRMED) {
        throw new BadRequestError(
          "Cannot dispute an already confirmed repayment",
        );
      }
      if (repayment.status === REPAYMENT_STATUS.DISPUTED) {
        throw new BadRequestError("This repayment has already been disputed");
      }

      await this.updateStatusTransaction(
        repaymentId,
        REPAYMENT_STATUS.DISPUTED,
        t,
      );

      const totalPaid = await this.sumConfirmedByDebtId(debtId, t);
      const remaining = parseFloat(debt.amount) - parseFloat(totalPaid);

      const noConfirmedPayments = remaining === parseFloat(debt.amount);
      const newDebtStatus = noConfirmedPayments
        ? DEBT_STATUS.ACTIVE
        : DEBT_STATUS.PARTIALLY_PAID;
      await this.debtRepository.updateStatus(debtId, newDebtStatus, t);

      return { repayment, debt, remaining, newDebtStatus };
    });
  }
}

export default new RepaymentRepository();

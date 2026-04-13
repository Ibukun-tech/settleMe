import { DEBT_STATUS, REPAYMENT_STATUS } from "../enum/index.js";
import logger from "../../../common/logger/logger.js";
import {
  ConflictError,
  NotFoundError,
  InternalError,
  BadRequestError,
  ForbiddenError,
} from "../../../common/middleware/error.js";
import repaymentRepsoitory from "../repository/repayment.repository.js";
import userRepository from "../../user/repository/user.repository.js";
import {
  publishRepaymentCreated,
  publishDebtSettled,
  publishDebtConfirmed,
} from "../../../common/infrastructure/publisherToQueue.js";

class RepaymentService {
  constructor() {
    this.userRepository = userRepository;
    this.repaymentRepsoitory = repaymentRepsoitory;
    this.logger = logger;
  }
  async handleErrors(fn) {
    try {
      return await fn();
    } catch (error) {
      if (
        error instanceof ConflictError ||
        error instanceof NotFoundError ||
        error instanceof BadRequestError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }
      this.logger.error(`Unexpected error in RepaymentService: ${error}`);
      throw new InternalError("An unexpected error occurred");
    }
  }
  async createRepayment(getUser, dto) {
    return await this.handleErrors(async () => {
      const { id: userId } = getUser;
      const { debtId, amount } = dto;
      const user = await this.userRepository.findByIdWithProfile(userId);
      const profile = user?.Profile ?? null;
      if (!profile) {
        throw new NotFoundError(
          "You have not created your profile, go and do so",
        );
      }
      const repayment = await this.repaymentRepsoitory.RepaymentTransaction(
        debtId,
        profile,
      );
      // I am still coming here to work on this queue I need to know the implication before I swallow a system lieke this honestly
      try {
        await publishRepaymentCreated({
          debt_id: debtId,
          repayment_id: repayment.repayment.id,
          lender_profile_id: repayment.debt.lender_id,
          borrower_first_name: profile.first_name,
          amount_paid: amount,
          remaining_balance: repayment.remaining - amount,
        });
      } catch (err) {
        this.logger.error(
          { err },
          "repayment.created publish failed — repayment is saved, notification skipped",
        );
      }
      return {
        message: "Repayment logged successfully",
        data: {
          id: repayment.repayment.id,
          debt_id: debtId,
          amount: repayment.repayment.amount,
          status: repayment.repayment.status,
          created_at: repayment.repayment.created_at,
        },
      };
    });
  }
  async confirmRepayment(getUser, dto) {
    return await this.handleErrors(async () => {
      const { id: userId } = getUser;
      const { debtId, repaymentId } = dto;

      const user = await this.userRepository.findByIdWithProfile(userId);
      const profile = user?.Profile ?? null;
      if (!profile) {
        throw new NotFoundError(
          "You have not created your profile, go and do so",
        );
      }
      const result = await this.repaymentRepsoitory.confirmRepaymentTransaction(
        debtId,
        repaymentId,
        profile,
      );
      // try {
      //   await publishRepaymentConfirmed({
      //     debt_id: debtId,
      //     repayment_id: repaymentId,
      //     lender_first_name: profile.first_name,
      //     borrower_profile_id: result.debt.borrower_id,
      //     amount_paid: result.repayment.amount,
      //     remaining_balance: result.remaining,
      //   });

      //   if (result.isSettled) {
      //     const borrowerProfile = await this.userRepository.findProfileById(
      //       result.debt.borrower_id,
      //     );
      //     await publishDebtSettled({
      //       debt_id: debtId,
      //       lender_profile_id: result.debt.lender_id,
      //       borrower_profile_id: result.debt.borrower_id,
      //       lender_first_name: profile.first_name,
      //       borrower_first_name: borrowerProfile?.first_name ?? null,
      //       total_amount: result.debt.amount,
      //     });
      //   }
      // } catch (err) {
      //   this.logger.error(
      //     { err },
      //     "repayment.confirmed publish failed — repayment is saved, notification skipped",
      //   );
      // }

      return {
        message: "Repayment confirmed successfully",
        data: {
          repayment: {
            id: repaymentId,
            debt_id: debtId,
            amount: result.repayment.amount,
            status: REPAYMENT_STATUS.CONFIRMED,
          },
          debt: {
            id: debtId,
            status: result.newDebtStatus,
            remaining_balance: result.remaining,
          },
        },
      };
    });
  }
  async disputeRepayment(getUser, repaymentId) {
    return await this.handleErrors(async () => {
      const { id: userId } = getUser;
      const { debtId, repaymentId } = dto;

      const user = await this.userRepository.findByIdWithProfile(userId);
      const profile = user?.Profile ?? null;
      if (!profile) {
        throw new NotFoundError(
          "You have not created your profile, go and do so",
        );
      }
      const result = await this.repaymentRepsoitory.disputeRepaymentTransaction(
        debtId,
        repaymentId,
        profile,
      );
      // Step 15 — Publish event (fire-and-forget)
      // try {
      //   await publishRepaymentDisputed({
      //     debt_id: debtId,
      //     repayment_id: repaymentId,
      //     lender_profile_id: profile.id,
      //     lender_first_name: profile.first_name,
      //     borrower_profile_id: result.debt.borrower_id,
      //     amount: result.repayment.amount,
      //   });
      // } catch (err) {
      //   this.logger.error(
      //     { err },
      //     "repayment.disputed publish failed — dispute is saved, notification skipped",
      //   );
      // }
      return {
        message: "Repayment disputed successfully",
        data: {
          repayment: {
            id: repaymentId,
            debt_id: debtId,
            amount: result.repayment.amount,
            status: REPAYMENT_STATUS.DISPUTED,
          },
          debt: {
            id: debtId,
            status: result.newDebtStatus,
            remaining_balance: result.remaining,
          },
        },
      };
    });
  }
}
export default new RepaymentService();

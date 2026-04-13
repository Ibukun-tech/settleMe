import { DEBT_STATUS, REPAYMENT_STATUS } from "../enum/index.js";
import logger from "../../../common/logger/logger.js";
import {
  ConflictError,
  NotFoundError,
  InternalError,
  BadRequestError,
  ForbiddenError,
} from "../../../common/middleware/error.js";
import debtRepository from "../repository/debt.repository.js";
import userRepository from "../../user/repository/user.repository.js";
import {
  publishDebtCreated,
  publishDebtConfirmed,
} from "../../../common/infrastructure/publisherToQueue.js";

class DebtService {
  constructor() {
    this.userRepository = userRepository;
    this.debtRepository = debtRepository;
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
      this.logger.error(`Unexpected error in DebtService: ${error}`);
      throw new InternalError("An unexpected error occurred");
    }
  }
  async createDebt(getUser, dto) {
    return await this.handleErrors(async () => {
      const { id: userId, email } = getUser;
      const { smeTag, amount, dueDate } = dto;

      const lenderProfile =
        await this.userRepository.findByIdWithProfile(userId);
      if (!lenderProfile?.Profile) {
        throw new NotFoundError(
          "you have not created your profile go and do so",
        );
      }
      this.logger.info(lenderProfile);
      const borrowerProfile =
        await this.userRepository.findProfileByTag(smeTag);
      this.logger.info(borrowerProfile);
      if (!borrowerProfile) throw new NotFoundError("User not found");
      if (borrowerProfile?.id === lenderProfile?.Profile.id) {
        throw new BadRequestError("You cannot create a debt with yourself");
      }
      const debt = await this.debtRepository.create({
        lender_id: lenderProfile?.Profile.id,
        borrower_id: borrowerProfile?.id,
        amount,
        due_date: dueDate,
        status: DEBT_STATUS.PENDING,
      });

      publishDebtCreated({
        debt_id: debt?.id,
        lender_profile_id: lenderProfile?.Profile.id,
        lender_first_name: lenderProfile?.Profile.first_name,
        borrower_profile_id: borrowerProfile?.id,
        amount,
        dueDate: debt?.due_date,
      });
      return {
        message: "Debt created successfully",
        data: {
          id: debt?.id,
          amount: debt?.amount,
          status: debt?.status,
          dueDate: debt?.due_date,
          created_at: debt?.created_at,
        },
      };
    });
  }
  async getUserDebts(getUser, filters) {
    return await this.handleErrors(async () => {
      // I am coming back here to work on this method to get something to work there
      const { id: userId } = getUser;
      const profile = await this.userRepository.findByIdWithProfile(userId);
      if (!profile?.Profile) {
        throw new NotFoundError(
          "you have not created your profile go and do so",
        );
      }
      let statusFilter;
      if (!filters) {
        statusFilter = { status: DEBT_STATUS.ACTIVE };
      }
      const debts = await this.debtRepository.findUserDebts(
        profile?.Profile?.id,
        !filters ? statusFilter : filters,
      );
      const as_lender = debts.filter(
        (d) => d?.lender_id === profile?.Profile?.id,
      );
      const as_borrower = debts.filter(
        (d) => d?.borrower_id === profile?.Profile?.id,
      );

      return {
        message: "Debts retrieved successfully",
        data: { as_lender, as_borrower },
      };
    });
  }
  async getDebtById(getUser, debtId) {
    return await this.handleErrors(async () => {
      this.logger.info(
        `Fetching debt with ID: ${debtId} for user ID: ${getUser.id}`,
      );
      const { id: userId } = getUser;
      const user = await this.userRepository.findByIdWithProfile(userId);
      this.logger.info(`User profile: ${JSON.stringify(user)}`);
      const profile = user?.Profile ?? null;
      this.logger.info(`User profile found: ${JSON.stringify(profile)}`);
      if (!profile) {
        throw new NotFoundError(
          "you have not created your profile go and do so",
        );
      }
      const debt = await this.debtRepository.findByDebtId(debtId);
      if (!debt) throw new NotFoundError("Debt not found");
      this.logger.info(`Debt found: ${JSON.stringify(debt)}`);
      if (debt.lender_id !== profile.id && debt.borrower_id !== profile.id) {
        throw new ForbiddenError("You do not have access to this debt");
      }
      const repayments = debt.Repayments ?? [];
      const totalPaid = repayments
        .filter((r) => r.status === REPAYMENT_STATUS.CONFIRMED)
        .reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const remaining_balance = parseFloat(debt.amount) - totalPaid;

      return {
        message: "Debt retrieved successfully",
        data: {
          id: debt.id,
          amount: debt.amount,
          due_date: debt?.due_date,
          status: debt.status,
          created_at: debt?.created_at,
          remaining_balance,
          lender: debt.lender,
          borrower: debt.borrower,
          repayments,
        },
      };
    });
  }
  async confirmDebt(getUser, debtId) {
    return await this.handleErrors(async () => {
      const { id: userId } = getUser;
      const user = await this.userRepository.findByIdWithProfile(userId);
      const profile = user?.Profile ?? null;
      if (!profile) {
        throw new NotFoundError(
          "you have not created your profile go and do so",
        );
      }
      const debt = await this.debtRepository.findById(debtId);
      if (!debt) throw new NotFoundError("Debt not found");
      if (debt.status !== DEBT_STATUS.PENDING_CONFIRMATION) {
        throw new BadRequestError(
          "Debt cannot be confirmed in its current state",
        );
      }
      if (debt?.borrower_id !== profile?.id) {
        throw new ForbiddenError("Only the borrower can confirm a debt");
      }
      await this.debtRepository.updateStatus(debtId, {
        status: DEBT_STATUS.ACTIVE,
      });
      // (debt_id, lender_profile_id, borrower_first_name, amount);
      try {
        await publishDebtConfirmed({
          debt_id: debt?.id,
          lender_profile_id: debt?.lender_id,
          borrower_first_name: profile?.first_name,
          amount: debt?.amount,
        });
      } catch (err) {
        logger.error(
          `Failed to publish debt confirmation for debt ID ${debtId}: ${err}`,
        );
        // If there is a logger service throw state it in there the reason why it failed
      }
      //  another TODO: send notification to lender about debt confirmation through a queue
      //  await publishDebtConfirmed({
      //    lender_profile_id: debt.lender_id,
      //    borrower_name: debt.borrower.first_name,
      //    amount: debt.amount,
      //    debt_id: debt.id,
      //  });
      return {
        message: "Debt confirmed successfully",
        data: {
          id: debt.id,
          lender_id: debt?.lender_id,
          borrower_id: debt?.borrower_id,
          amount: debt?.amount,
          due_date: debt?.due_date,
          status: DEBT_STATUS.ACTIVE,
          created_at: debt?.created_at,
        },
      };
    });
  }
  async disputeDebt(getUser, debtId) {
    return await this.handleErrors(async () => {
      const { id: userId } = getUser;
      const user = await this.userRepository.findByIdWithProfile(userId);
      const profile = user?.Profile ?? null;
      if (!profile) {
        throw new NotFoundError(
          "you have not created your profile go and do so",
        );
      }
      const debt = await this.debtRepository.findByDebtId(debtId);
      if (!debt) throw new NotFoundError("Debt not found");
      if (
        ![
          DEBT_STATUS.PENDING_CONFIRMATION,
          DEBT_STATUS.ACTIVE,
          DEBT_STATUS.PARTIALLY_PAID,
        ].includes(debt.status)
      ) {
        throw new BadRequestError(
          "Debt cannot be disputed in its current state",
        );
      }
      if (debt.lender_id !== profile.id && debt.borrower_id !== profile.id) {
        throw new ForbiddenError("You do not have access to this debt");
      }
      // Step 6 — update status to DISPUTED
      await this.debtRepository.updateStatus(debtId, DEBT_STATUS.DISPUTED);

      //       debt_id,
      // lender_profile_id,
      // lender_first_name,
      // borrower_profile_id,
      // borrower_first_name,
      // disputed_by_profile_id,
      // amount,
      // TODO: send notification to the other party about the dispute through a queue
      // Step 7 — publish debt.disputed event
      try {
        await publishDebtDisputed({
          lender_profile_id: debt.lender.id,
          borrower_profile_id: debt.borrower.id,
          lender_first_name: debt.lender.first_name,
          borrower_first_name: debt.borrower.first_name,
          disputed_by_profile_id: profile.id,
          amount: debt.amount,
          debt_id: debt.id,
        });
      } catch (err) {
        logger.error(
          `Failed to publish debt dispute for debt ID ${debtId}: ${err}`,
        );
        // If there is a logger service throw state it in there the reason why it failed
      } // Step 8 — return updated debt
      return {
        message: "Debt disputed successfully",
        data: {
          id: debt.id,
          lender_id: debt.lender_id,
          borrower_id: debt.borrower_id,
          amount: debt.amount,
          due_date: debt.due_date,
          status: DEBT_STATUS.DISPUTED,
          created_at: debt.created_at,
        },
      };
    });
  }
}
export default new DebtService();

// active user to test with
// {
// 	"email": "ibk13232325@gmail.com",
//     "password":"Ibukun@1234.ywywy"
// }
// another user
// {
// 	"email": "ibk132323215@gmail.com",
//     "password":"Ibukun@1234.ywywy"
// }
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
//   .eyJzdWIiOiIyZTg3YWI2NC0zZTc1LTQ1Y2YtOWVmYy01Y2E5M2JhY2UzZWUiLCJlbWFpbCI6ImliazEzMjMyMzIxNUBnbWFpbC5jb20iLCJpYXQiOjE3NzU3MjUyODEsImV4cCI6MTc3NTgxMTY4MX0
//   .mqqY - usn4C1fP8oQwkepSaZOTK__fweMVp0zhUGXZS8;

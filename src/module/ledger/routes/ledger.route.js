import { Router } from "express";
import { authenticate } from "../../../common/middleware/authenticate.js";
import {
  createDebt,
  getUserDebts,
  getDebtById,
  confirmDebt,
  disputeDebt,
  createRepayment,
  confirmRepayment,
  disputeRepayment,
} from "../controller/ledger.controller.js";
import validate from "../../../common/middleware/validate.js";
import {
  createRepaymentDto,
  createDebtDto,
  getUserDebtsDto,
  getDebtByIdDto,
  confirmRepaymentDto,
} from "../validator/ledger.dto.js";

const router = Router();

router.post("/create-debt", authenticate, validate(createDebtDto), createDebt);
router.get(
  "/my-debts",
  authenticate,
  validate(getUserDebtsDto, "query"),
  getUserDebts,
);
router.get(
  "/debts/:id",
  authenticate,
  validate(getDebtByIdDto, "params"),
  getDebtById,
);
router.patch(
  "/debts/:id/confirm",
  authenticate,
  validate(getDebtByIdDto, "params"),
  confirmDebt,
);
router.patch(
  "/debts/:id/dispute",
  authenticate,
  validate(getDebtByIdDto, "params"),
  disputeDebt,
);
// for repayment
router.post(
  "/debts/:id/repayments",
  authenticate,
  validate(getDebtByIdDto, "params"),
  validate(createRepaymentDto),
  createRepayment,
);
router.patch(
  "/debts/:id/repayments/:repaymentId/confirm",
  authenticate,
  validate(confirmRepaymentDto, "params"),
  confirmRepayment,
);
export default router;
// I already implemented all the debt route we have not done the repayment

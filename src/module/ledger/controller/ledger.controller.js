import debtService from "../service/debt.service.js";
import ApiResponse from "../../../common/middleware/response.js";
import repaymentService from "../service/repayment.service.js";

export const createDebt = async (req, res, next) => {
  try {
    const { message, data } = await debtService.createDebt(req.user, req.body);
    ApiResponse.created(res, data, message);
  } catch (error) {
    next(error);
  }
};
export const getUserDebts = async (req, res, next) => {
  try {
    console.log(req);
    const { message, data } = await debtService.getUserDebts(
      req.user,
      req.query,
    );
    return ApiResponse.ok(res, data, message);
  } catch (error) {
    next(error);
  }
};

export const getDebtById = async (req, res, next) => {
  try {
    const { message, data } = await debtService.getDebtById(
      req.user,
      req.params.id,
    );
    return ApiResponse.ok(res, data, message);
  } catch (error) {
    next(error);
  }
};

export const confirmDebt = async (req, res, next) => {
  try {
    const { message, data } = await debtService.confirmDebt(
      req.user,
      req.params.id,
    );
    return ApiResponse.ok(res, data, message);
  } catch (error) {
    next(error);
  }
};
export const disputeDebt = async (req, res, next) => {
  try {
    const { message, data } = await debtService.disputeDebt(
      req.user,
      req.params.id,
    );
    return ApiResponse.ok(res, data, message);
  } catch (error) {
    next(error);
  }
};

//crete repayment

export const createRepayment = async (req, res, next) => {
  try {
    const { message, data } = await repaymentService.createRepayment(req.user, {
      debtId: req.params.id,
      amount: req.body.amount,
    });
    ApiResponse.created(res, data, message);
  } catch (error) {
    next(error);
  }
};
export const confirmRepayment = async (req, res, next) => {
  try {
    const { message, data } = await repaymentService.confirmRepayment(
      req.user,
      {
        debtId: req.params.id,
        repaymentId: req.params.repaymentId,
      },
    );
    ApiResponse.ok(res, data, message);
  } catch (error) {
    next(error);
  }
};
export const disputeRepayment = async (req, res, next) => {
  try {
    const { message, data } = await repaymentService.disputeRepayment(
      req.user,
      {
        debtId: req.params.id,
        repaymentId: req.params.repaymentId,
      },
    );
    ApiResponse.ok(res, data, message);
  } catch (error) {
    next(error);
  }
};

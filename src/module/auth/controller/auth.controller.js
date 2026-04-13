import authService from "../service/auth.service.js";
import ApiResponse from "../../../common/middleware/response.js";

export const register = async (req, res) => {
  try {
    const register = req.body;
    const { message, data } = await authService.register(register);
    return ApiResponse.created(res, data, message);
  } catch (error) {
    throw error;
  }
};

export const verify = async (req, res) => {
  try {
    const { message } = await authService.verify(req.body);
    return ApiResponse.ok(res, message);
  } catch (error) {
    throw error;
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { message, data } = await authService.resendOtp(req.body);
    return ApiResponse.ok(res, data, message);
  } catch (error) {
    throw error;
  }
};

export const login = async (req, res) => {
  try {
    const { message, data } = await authService.login(req.body);
    return ApiResponse.ok(res, data, message);
  } catch (error) {
    throw error;
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { message } = await authService.forgotPassword(req.body);
    return ApiResponse.ok(res, null, message);
  } catch (error) {
    throw error;
  }
};
export const resetPassword = async (req, res) => {
  try {
    const { message } = await authService.resetPassword(req.body);
    return ApiResponse.ok(res, null, message);
  } catch (error) {
    throw error;
  }
};

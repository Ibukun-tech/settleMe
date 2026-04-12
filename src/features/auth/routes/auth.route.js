import { Router } from "express";
import validate from "../../../common/middleware/validate.js";
import {
  registerDto,
  verifyDto,
  resendOtpDto,
  loginDto,
  forgotPasswordDto,
  resetPasswordDto,
} from "../validator/auth.dto.js";
import {
  register,
  verify,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
} from "../controller/auth.controller.js";
const router = Router();

router.post("/register", validate(registerDto), register);
router.post("/verify", validate(verifyDto), verify);
router.post("/resend-otp", validate(resendOtpDto), resendOtp);

router.post("/login", validate(loginDto), login);
router.post("/forgot-password", validate(forgotPasswordDto), forgotPassword);
router.post("/reset-password", validate(resetPasswordDto), resetPassword);
export default router;

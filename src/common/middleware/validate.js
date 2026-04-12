const validate =
  (schema, target = "body") =>
  async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[target]);
      Object.defineProperty(req, target, {
        value: parsed,
        writable: true,
        configurable: true,
      });
      next();
    } catch (err) {
      next(err);
    }
  };

export default validate;

// I love that you would do the resendOtpDto and also I dont want us to implement  this invalidateOtpsByUserAndType(userId, type, transaction?) — bulk-sets is_used: true on all unused OTPs for that user+type — ensures old codes are dead before issuing a new one do this too Service — fill in resendOtp(resendOtpDto) in auth.service.js, inside handleErrors:

// Find user by email → NotFoundError if absent
// Guard: if type === EMAIL_VERIFICATION and user.is_verified → BadRequestError("Account is already verified")
// Call invalidateOtpsByUserAndType(user.id, otpType) to kill old codes do this
// Call this.generateAndSendOtp(user, user.email, otpType) — reuses the existing helper, no duplication
// Return { message: "OTP resent successfully", data: { email: user.email } }
// do this also
// Controller — add resendOtp export to auth.controller.js: calls authService.resendOtp(req.body), returns ApiResponse.ok

// Route — add POST /resend-otp to auth.route.js with validate(resendOtpDto) middleware

// but do not implement this do you understand
// findLatestOtp(userId, type) — finds the most recently created OTP for that user+type (regardless of is_used), ordered by created_at DESC, limit 1 — used to enforce co

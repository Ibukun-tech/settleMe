import authRepository from "../../repository/auth.repository.js";
import mailService from "../../Mail/service/mail.service.js";
import {
  ConflictError,
  NotFoundError,
  InternalError,
  BadRequestError,
  AuthenticationError,
  ForbiddenError,
} from "../../../common/middleware/error.js";

import { OTP_TYPE } from "../../commonFeature/index.js";
import {
  generateOtpCode,
  generatePasswordHash,
  comparePassword,
  createToken,
} from "./auth.service.util.js";
import logger from "../../../common/logger/logger.js";

class AuthService {
  constructor() {
    this.authRepository = authRepository;
    this.logger = logger;
    this.mailService = mailService;
  }
  async handleErrors(fn) {
    try {
      return await fn();
    } catch (error) {
      if (
        error instanceof ConflictError ||
        error instanceof NotFoundError ||
        error instanceof BadRequestError ||
        error instanceof AuthenticationError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }
      this.logger.error(`Unexpected error in AuthService: ${error}`);
      throw new InternalError("An unexpected error occurred");
    }
  }
  async register(registerDto) {
    return await this.handleErrors(async () => {
      const { email, password } = registerDto;

      const existing = await authRepository.findByEmail(email);
      if (existing) {
        throw new ConflictError("Email is already registered");
      }

      const passwordHash = await generatePasswordHash(password);

      const user = await authRepository.create(email, passwordHash);
      await this.generateAndSendOtp(
        user,
        user?.email,
        OTP_TYPE.EMAIL_VERIFICATION,
      );
      return {
        message: "Registration successful check your email for the OTP code",
        data: {
          email: user.email,
        },
      };
    });
  }
  async verify(verifyDto) {
    return await this.handleErrors(async () => {
      const { email, code, type } = verifyDto;

      const user = await this.authRepository.findByEmail(email);
      if (!user) {
        throw new NotFoundError("No account found with that email address");
      }
      const otpType = type.toUpperCase();

      if (
        ![OTP_TYPE.EMAIL_VERIFICATION, OTP_TYPE.PASSWORD_RESET].includes(
          otpType,
        )
      ) {
        throw new BadRequestError("Invalid OTP type");
      }

      const otp = await this.authRepository.findActiveOtp(
        user.id,
        code,
        otpType,
      );

      if (!otp) {
        throw new BadRequestError("Invalid or already used OTP code");
      }

      if (new Date() > new Date(otp.expires_at)) {
        throw new BadRequestError(
          "OTP code has expired, please request a new one",
        );
      }
      if (otpType === OTP_TYPE.EMAIL_VERIFICATION) {
        await this.authRepository.verifyOtp(user.id, otp.id, true);
      } else {
        await this.authRepository.verifyOtp(user.id, otp.id, false);
      }
      return {
        message: "Email verified successfully",
      };
    });
  }
  async resendOtp(resendOtpDto) {
    return await this.handleErrors(async () => {
      const { email, type } = resendOtpDto;
      const otpType = type.toUpperCase();

      const user = await this.authRepository.findByEmail(email);
      if (!user) {
        throw new NotFoundError("No account found with that email address");
      }

      if (otpType === OTP_TYPE.EMAIL_VERIFICATION && user.is_verified) {
        throw new BadRequestError("This account is already verified");
      }

      await this.authRepository.invalidateOtpsByUserAndType(user.id, otpType);
      await this.generateAndSendOtp(user, user.email, otpType);

      return {
        message: "OTP resent successfully",
        data: { email: user.email },
      };
    });
  }
  async login(loginDto) {
    return await this.handleErrors(async () => {
      const { email, password } = loginDto;

      const DUMMY_HASH =
        "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345";
      const user = await this.authRepository.findByEmail(email);

      const passwordMatch = await comparePassword(
        password,
        user?.password_hash ?? DUMMY_HASH,
      );
      if (!user || !passwordMatch) {
        throw new AuthenticationError("Invalid email or password");
      }

      if (!user.is_verified) {
        throw new ForbiddenError("Please verify your email before logging in");
      }
      const profile = user?.Profile ?? null;
      delete profile?.dataValues?.user_id;

      const token = createToken({ sub: user.id, email: user.email });
      return {
        message: "Login successful",
        data: { token, email: user.email, profile },
      };
    });
  }
  async forgotPassword(forgotPasswordDto) {
    return await this.handleErrors(async () => {
      this.logger.info("This is the forget password function");
      const { email } = forgotPasswordDto;
      const user = await this.authRepository.findByEmail(email);
      if (user) {
        await this.authRepository.invalidateOtpsByUserAndType(
          user.id,
          OTP_TYPE.PASSWORD_RESET,
        );
        await this.generateAndSendOtp(
          user,
          user.email,
          OTP_TYPE.PASSWORD_RESET,
        );
      }
      this.logger.info(
        `Password reset requested for email: ${email}, user found: ${!!user}`,
      );
      return {
        message:
          "If an account with that email exists, a reset code has been sent",
      };
    });
  }
  async resetPassword(resetPasswordDto) {
    return await this.handleErrors(async () => {
      this.logger.info("The begining of the reset password");
      const { email, code, newPassword } = resetPasswordDto;
      const user = await this.authRepository.findByEmail(email);
      if (!user) {
        throw new NotFoundError("No account found with that email address");
      }
      const otp = await this.authRepository.findActiveOtp(
        user.id,
        code,
        OTP_TYPE.PASSWORD_RESET,
      );
      if (!otp) {
        throw new BadRequestError("Invalid or already used OTP code");
      }

      if (new Date() > new Date(otp.expires_at)) {
        throw new BadRequestError(
          "OTP code has expired, please request a new one",
        );
      }

      const newPasswordHash = await generatePasswordHash(newPassword);
      await this.authRepository.resetPassword(user.id, otp.id, newPasswordHash);

      return { message: "Password reset successfully" };
    });
  }
  async generateAndSendOtp(user, email, otpType) {
    try {
      const otpCode = generateOtpCode(6, "numeric");

      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await this.authRepository.createOtp(
        user?.id,
        otpCode,
        otpType,
        otpExpiry,
      );
      this.logger.info(`Generated OTP code ${otpCode} for user ${email}`);
      if (otpType === OTP_TYPE.EMAIL_VERIFICATION) {
        this.mailService
          .sendVerificationEmailOtp(email, otpCode)
          .catch((error) => {
            this.logger.error(
              `Failed to send verification email to ${email}: ${error}`,
            );
          });
      }
      if (otpType === OTP_TYPE.PASSWORD_RESET) {
        this.mailService
          .sendPasswordResetEmailOtp(email, otpCode)
          .catch((error) => {
            this.logger.error(
              `Failed to send password reset email to ${email}: ${error}`,
            );
          });
      }
    } catch (error) {
      this.logger.error(`this ${email} was not sent and this is the ${error} `);
    }
  }
}
export default new AuthService();

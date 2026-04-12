import { email, z } from "zod";
import { OTP_TYPE } from "../../commonFeature/index.js";

export const registerDto = z.object({
  email: z.email({ pattern: z.regexes.email }),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password must not exceed 64 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
});

export const verifyDto = z.object({
  email: z.email({ pattern: z.regexes.email }),
  type: z.string({ required_error: "OTP type is required" }),
  code: z
    .string({ required_error: "OTP code is required" })
    .length(6, "OTP code must be 6 digits"),
});

export const resendOtpDto = z.object({
  email: z.email({ pattern: z.regexes.email }),
  type: z.enum(Object.values(OTP_TYPE), {
    required_error: "OTP type is required",
  }),
});

export const loginDto = z.object({
  email: z.email({ pattern: z.regexes.email }),
  password: z.string({ required_error: "Password is required" }),
});

export const forgotPasswordDto = z.object({
  email: z.email({ pattern: z.regexes.email }),
});

export const resetPasswordDto = z.object({
  email: z.email({ pattern: z.regexes.email }),
  code: z
    .string({ required_error: "OTP code is required" })
    .length(6, "OTP code must be 6 digits"),
  newPassword: z
    .string({ required_error: "New password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password must not exceed 64 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
});

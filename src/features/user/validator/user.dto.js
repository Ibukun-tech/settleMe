import { z } from "zod";

export const createProfileDto = z.object({
  firstName: z.string().min(1, "First name is required").trim(),
  lastName: z.string().min(1, "Last name is required").trim(),
  phoneNumber: z.string().min(1, "Phone number is required").trim(),
});

export const getProfileByIdDto = z.object({
  id: z.string().uuid("Invalid profile ID"),
});
export const updateProfileDto = z
  .object({
    firstName: z.string().min(1).trim().optional(),
    lastName: z.string().min(1).trim().optional(),
    phoneNumber: z.string().min(1).trim().optional(),
    smeTag: z.string().min(3).trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const createRepaymentDto = z.object({
  amount: z
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
    })
    .positive("Amount must be greater than zero")
    .refine((v) => Number((v % 1).toFixed(10)) === 0, {
      message: "Amount must have at most 2 decimal places",
    }),
});

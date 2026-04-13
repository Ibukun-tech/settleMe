import { z } from "zod";
import { DEBT_STATUS } from "../enum/debt.enum.js";
export const createDebtDto = z.object({
  smeTag: z
    .string({ required_error: "sme_tag is required" })
    .min(1, "sme_tag is required"),
  amount: z
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
    })
    .positive("Amount must be greater than zero"),
  dueDate: z
    .string()
    .date("dueDate must be a valid date (YYYY-MM-DD)")
    .refine((d) => new Date(d) > new Date(), {
      message: "dueDate must be a future date",
    })
    .optional(),
});

export const getUserDebtsDto = z.object({
  status: z
    .enum(Object.values(DEBT_STATUS), {
      message: `status must be one of: ${Object.values(DEBT_STATUS).join(", ")}`,
    })
    .optional(),
});

export const getDebtByIdDto = z.object({
  id: z.string().uuid("Invalid debt ID"),
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

export const confirmRepaymentDto = z.object({
  id: z.string().uuid("Invalid debt ID"),
  repaymentId: z.string().uuid("Invalid repayment ID"),
});

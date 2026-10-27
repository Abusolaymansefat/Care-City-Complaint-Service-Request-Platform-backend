import z from "zod";
import { PaymentStatus } from "../../../generated/prisma/enums";

const uuidSchema = z.string().uuid("Invalid UUID");

const initiatePaymentSchema = z.object({
	complaintId: uuidSchema,
});

const bkashCallbackQuerySchema = z.object({
	paymentID: z.string().trim().min(1, "paymentID is required"),
	status: z.string().trim().min(1, "status is required"),
});

const paymentIdParamSchema = z.object({
	id: uuidSchema,
});

const paymentQuerySchema = z.object({
	status: z.enum(PaymentStatus).optional(),
	complaintId: uuidSchema.optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	sortBy: z.enum(["createdAt", "updatedAt", "amount", "status"]).optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const PaymentsValidation = {
	initiatePaymentSchema,
	bkashCallbackQuerySchema,
	paymentIdParamSchema,
	paymentQuerySchema,
};

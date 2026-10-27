import type { PaymentStatus } from "../../../generated/prisma/enums";

export interface IInitiatePaymentPayload {
	complaintId: string;
}

export interface IBkashCallbackQuery {
	paymentID: string;
	status: string;
}

export interface IPaymentQuery {
	page?: number;
	limit?: number;
	status?: PaymentStatus;
	complaintId?: string;
	sortBy?: "createdAt" | "updatedAt" | "amount" | "status";
	sortOrder?: "asc" | "desc";
}

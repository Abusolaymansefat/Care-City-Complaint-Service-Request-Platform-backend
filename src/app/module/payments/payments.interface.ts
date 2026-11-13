import type { PaymentStatus } from "../../../generated/prisma/enums";

export type PaymentPeriod = "all" | "7d" | "1m" | "1y";

export interface IInitiatePaymentPayload {
	complaintId: string;
}

export interface IPaymentStatsQuery {
	period: PaymentPeriod;
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
	period?: PaymentPeriod;
	sortBy?: "createdAt" | "updatedAt" | "amount" | "status";
	sortOrder?: "asc" | "desc";
}

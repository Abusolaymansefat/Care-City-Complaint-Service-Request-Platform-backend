import httpStatus from "http-status";
import {
	ComplaintStatus,
	PaymentStatus,
	PaymentTiming,
	Prisma,
	Role,
} from "../../../generated/prisma/client";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import { COMPLAINT_FEE, FREE_COMPLAINT_LIMIT } from "./payments.constants";
import type { IPaymentQuery } from "./payments.interface";

type IBkashCreateResponse = {
	statusCode?: string;
	statusMessage?: string;
	paymentID?: string;
	bkashURL?: string;
};

type IBkashExecuteResponse = {
	statusCode?: string;
	statusMessage?: string;
	paymentID?: string;
	trxID?: string;
	transactionStatus?: string;
	amount?: string;
};

const paymentInclude = {
	complaint: {
		select: {
			id: true,
			trackingCode: true,
			title: true,
			status: true,
			paymentRequired: true,
		},
	},
	user: {
		select: {
			id: true,
			name: true,
			email: true,
		},
	},
};

const bkashHeaders = async () => {
	const idToken = await getBkashIdToken();

	return {
		"Content-Type": "application/json",
		Accept: "application/json",
		Authorization: idToken as string,
		"X-APP-Key": config.bkash_app_key,
	};
};

const createInvoiceNumber = () => `INV${Date.now().toString().slice(-10)}`;

const isPaymentRequiredForComplaint = async (
	citizenId: string,
	complaintId: string,
) => {
	const complaints = await prisma.complaint.findMany({
		where: { citizenId },
		select: { id: true },
		orderBy: { createdAt: "asc" },
	});

	const complaintIndex = complaints.findIndex(
		(complaint) => complaint.id === complaintId,
	);

	return complaintIndex >= FREE_COMPLAINT_LIMIT;
};

const getComplaintForPayment = async (complaintId: string, userId: string) => {
	const complaint = await prisma.complaint.findUnique({
		where: { id: complaintId },
		select: {
			id: true,
			citizenId: true,
			status: true,
			trackingCode: true,
			paymentRequired: true,
		},
	});

	if (!complaint) {
		throw new AppError(httpStatus.NOT_FOUND, "Complaint not found");
	}

	if (complaint.citizenId !== userId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to pay for this complaint",
		);
	}

	return complaint;
};

const createBkashPayment = async (payload: {
	amount: number;
	invoiceNumber: string;
	payerReference: string;
}) => {
	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/create`,
		{
			method: "POST",
			headers: await bkashHeaders(),
			body: JSON.stringify({
				mode: "0011",
				payerReference: payload.payerReference,
				callbackURL: config.bkash_callback_url,
				amount: payload.amount.toFixed(2),
				currency: "BDT",
				intent: "sale",
				merchantInvoiceNumber: payload.invoiceNumber,
			}),
		},
	);

	const result = (await response.json()) as IBkashCreateResponse;

	if (!response.ok || result.statusCode !== "0000" || !result.paymentID) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			result.statusMessage ?? "Failed to create bKash payment",
		);
	}

	return result;
};

const executeBkashPayment = async (paymentID: string) => {
	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/execute`,
		{
			method: "POST",
			headers: await bkashHeaders(),
			body: JSON.stringify({ paymentID }),
		},
	);

	const result = (await response.json()) as IBkashExecuteResponse;

	if (!response.ok || result.statusCode !== "0000") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			result.statusMessage ?? "Failed to execute bKash payment",
		);
	}

	return result;
};

const initiatePayment = async (userId: string, complaintId: string) => {
	const complaint = await getComplaintForPayment(complaintId, userId);
	const paymentRequired = await isPaymentRequiredForComplaint(
		userId,
		complaintId,
	);

	if (!paymentRequired && !complaint.paymentRequired) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Payment is not required for this complaint",
		);
	}

	const existingPaidPayment = await prisma.payment.findFirst({
		where: {
			complaintId,
			status: PaymentStatus.PAID,
		},
	});

	if (existingPaidPayment) {
		throw new AppError(
			httpStatus.CONFLICT,
			"This complaint has already been paid",
		);
	}

	const existingInitiatedPayment = await prisma.payment.findFirst({
		where: {
			complaintId,
			userId,
			status: {
				in: [PaymentStatus.PENDING, PaymentStatus.INITIATED],
			},
		},
		include: paymentInclude,
		orderBy: { createdAt: "desc" },
	});

	if (existingInitiatedPayment?.paymentUrl) {
		return existingInitiatedPayment;
	}

	const timing =
		complaint.status === ComplaintStatus.RESOLVED ||
		complaint.status === ComplaintStatus.CLOSED
			? PaymentTiming.AFTER_COMPLETION
			: PaymentTiming.AFTER_SUBMISSION;

	const invoiceNumber = createInvoiceNumber();

	const payment = await prisma.payment.create({
		data: {
			userId,
			complaintId,
			amount: COMPLAINT_FEE,
			invoiceNumber,
			timing,
			status: PaymentStatus.PENDING,
		},
	});

	try {
		const bkashPayment = await createBkashPayment({
			amount: COMPLAINT_FEE,
			invoiceNumber,
			payerReference: complaint.trackingCode.slice(0, 20),
		});

		const [updatedPayment] = await prisma.$transaction([
			prisma.payment.update({
				where: { id: payment.id },
				data: {
					status: PaymentStatus.INITIATED,
					bkashPaymentId: bkashPayment.paymentID,
					paymentUrl: bkashPayment.bkashURL,
				},
				include: paymentInclude,
			}),
			prisma.complaint.update({
				where: { id: complaintId },
				data: { paymentRequired: true },
			}),
		]);

		return updatedPayment;
	} catch (error) {
		await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentStatus.FAILED,
				failureReason:
					error instanceof Error ? error.message : "Failed to initiate payment",
			},
		});

		throw error;
	}
};

const handleBkashCallback = async (paymentID: string, status: string) => {
	const payment = await prisma.payment.findUnique({
		where: { bkashPaymentId: paymentID },
		include: paymentInclude,
	});

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
	}

	if (payment.status === PaymentStatus.PAID) {
		return payment;
	}

	const normalizedStatus = status.toLowerCase();

	if (normalizedStatus === "cancel" || normalizedStatus === "cancelled") {
		return prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentStatus.CANCELLED,
				failureReason: "Payment cancelled by user",
			},
			include: paymentInclude,
		});
	}

	if (normalizedStatus === "failure" || normalizedStatus === "failed") {
		return prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentStatus.FAILED,
				failureReason: "Payment failed at bKash",
			},
			include: paymentInclude,
		});
	}

	if (normalizedStatus !== "success") {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid payment status");
	}

	try {
		const executedPayment = await executeBkashPayment(paymentID);

		if (executedPayment.transactionStatus?.toLowerCase() !== "completed") {
			return prisma.payment.update({
				where: { id: payment.id },
				data: {
					status: PaymentStatus.FAILED,
					failureReason:
						executedPayment.statusMessage ?? "Payment was not completed",
				},
				include: paymentInclude,
			});
		}

		const [updatedPayment] = await prisma.$transaction([
			prisma.payment.update({
				where: { id: payment.id },
				data: {
					status: PaymentStatus.PAID,
					transactionId: executedPayment.trxID,
					paidAt: new Date(),
					failureReason: null,
				},
				include: paymentInclude,
			}),
			prisma.complaint.update({
				where: { id: payment.complaintId },
				data: { paymentRequired: false },
			}),
		]);

		return updatedPayment;
	} catch (error) {
		return prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentStatus.FAILED,
				failureReason:
					error instanceof Error ? error.message : "Failed to execute payment",
			},
			include: paymentInclude,
		});
	}
};

const listPayments = async (
	where: Prisma.PaymentWhereInput,
	query: IPaymentQuery,
) => {
	const page = query.page ?? 1;
	const limit = query.limit ?? 10;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ?? "createdAt";
	const sortOrder = query.sortOrder ?? "desc";

	const [payments, total] = await Promise.all([
		prisma.payment.findMany({
			where,
			skip,
			take: limit,
			orderBy: {
				[sortBy]: sortOrder,
			},
			include: paymentInclude,
		}),
		prisma.payment.count({ where }),
	]);

	return {
		data: payments,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getMyPayments = async (userId: string, query: IPaymentQuery) =>
	listPayments(
		{
			userId,
			status: query.status,
			complaintId: query.complaintId,
		},
		query,
	);

const getPayments = async (query: IPaymentQuery) =>
	listPayments(
		{
			status: query.status,
			complaintId: query.complaintId,
		},
		query,
	);

const getPaymentById = async (id: string, userId: string, role: Role) => {
	const payment = await prisma.payment.findUnique({
		where: { id },
		include: paymentInclude,
	});

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
	}

	const isOwner = payment.userId === userId;
	const isAdmin = role === Role.ADMIN;

	if (!isOwner && !isAdmin) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to view this payment",
		);
	}

	return payment;
};

export const paymentsService = {
	initiatePayment,
	handleBkashCallback,
	getMyPayments,
	getPayments,
	getPaymentById,
};

import type { Request, Response } from "express";
import httpStatus from "http-status";
import config from "../../config";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IBkashCallbackQuery,
	IInitiatePaymentPayload,
	IPaymentQuery,
} from "./payments.interface";
import { paymentsService } from "./payments.service";

const getAuthenticatedUser = (req: Request) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You must be logged in");
	}

	return req.user;
};

const getPaymentId = (req: Request) => {
	const id = req.params.id;
	if (!id || Array.isArray(id)) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid payment ID");
	}

	return id;
};

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const { complaintId } = req.body as IInitiatePaymentPayload;
	const result = await paymentsService.initiatePayment(
		user.userId,
		complaintId,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Payment initiated successfully",
		data: result,
	});
});

const handleBkashCallback = catchAsync(async (req: Request, res: Response) => {
	const { paymentID, status } = req.query as unknown as IBkashCallbackQuery;
	const result = await paymentsService.handleBkashCallback(paymentID, status);
	const frontendUrl = config.frontend_url.replace(/\/+$/, "");

	res.redirect(
		`${frontendUrl}/payments/callback?paymentId=${result.id}&status=${result.status}`,
	);
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const result = await paymentsService.getMyPayments(
		user.userId,
		req.query as unknown as IPaymentQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payments retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getPayments = catchAsync(async (req: Request, res: Response) => {
	const result = await paymentsService.getPayments(
		req.query as unknown as IPaymentQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payments retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const result = await paymentsService.getPaymentById(
		getPaymentId(req),
		user.userId,
		user.role,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment retrieved successfully",
		data: result,
	});
});

export const PaymentsController = {
	initiatePayment,
	handleBkashCallback,
	getMyPayments,
	getPayments,
	getPaymentById,
};

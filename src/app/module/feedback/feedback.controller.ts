import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { feedbackService } from "./feedback.service";
import { createFeedbackSchema, feedbackIdSchema } from "./feedback.validation";

const getAuthenticatedUser = (req: Request) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You must be logged in");
	}

	return req.user;
};

const getFeedbackId = (req: Request) => {
	const result = feedbackIdSchema.safeParse({ params: req.params });

	if (!result.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			result.error.issues[0]?.message ?? "Invalid feedback ID",
		);
	}

	return result.data.params.id;
};

const createFeedback = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const payload = createFeedbackSchema.safeParse({ body: req.body });

	if (!payload.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			payload.error.issues[0]?.message ?? "Invalid feedback data",
		);
	}

	const result = await feedbackService.createFeedback(
		user.userId,
		payload.data.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Feedback created successfully",
		data: result,
	});
});

const getFeedback = catchAsync(async (req: Request, res: Response) => {
	const result = await feedbackService.getFeedback(getFeedbackId(req));
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Feedback retrieved successfully",
		data: result,
	});
});

const hideFeedback = catchAsync(async (req: Request, res: Response) => {
	const result = await feedbackService.hideFeedback(getFeedbackId(req));
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Feedback hidden successfully",
		data: result,
	});
});

export const FeedbackController = {
	createFeedback,
	getFeedback,
	hideFeedback,
};

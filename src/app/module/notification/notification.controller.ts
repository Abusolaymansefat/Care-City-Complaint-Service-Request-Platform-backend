import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { INotificationQuery } from "./notification.interface";
import { notificationService } from "./notification.service";

const getAuthenticatedUser = (req: Request) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You must be logged in");
	}

	return req.user;
};

const getNotificationId = (req: Request) => {
	const id = req.params.id;
	if (!id || Array.isArray(id)) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid notification ID");
	}

	return id;
};

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const result = await notificationService.getMyNotifications(
		user.userId,
		req.query as unknown as INotificationQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Notifications retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const result = await notificationService.getUnreadCount(user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Unread count retrieved successfully",
		data: result,
	});
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const result = await notificationService.markAsRead(
		getNotificationId(req),
		user.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Notification marked as read",
		data: result,
	});
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const result = await notificationService.markAllAsRead(user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "All notifications marked as read",
		data: result,
	});
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const result = await notificationService.deleteNotification(
		getNotificationId(req),
		user.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Notification deleted successfully",
		data: result,
	});
});

export const NotificationController = {
	getMyNotifications,
	getUnreadCount,
	markAsRead,
	markAllAsRead,
	deleteNotification,
};

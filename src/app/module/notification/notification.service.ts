import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import type {
	ICreateNotificationPayload,
	INotificationQuery,
} from "./notification.interface";

const createNotification = async (payload: ICreateNotificationPayload) => {
	return prisma.notification.create({
		data: {
			userId: payload.userId,
			title: payload.title,
			message: payload.message,
			type: payload.type ?? "GENERAL",
			link: payload.link ?? null,
		},
	});
};

const getMyNotifications = async (
	userId: string,
	query: INotificationQuery,
) => {
	const page = query.page ?? 1;
	const limit = query.limit ?? 10;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ?? "createdAt";
	const sortOrder = query.sortOrder ?? "desc";

	const where: Prisma.NotificationWhereInput = {
		userId,
		isRead: query.isRead,
		type: query.type,
	};

	const [notifications, total] = await Promise.all([
		prisma.notification.findMany({
			where,
			skip,
			take: limit,
			orderBy: { [sortBy]: sortOrder },
		}),
		prisma.notification.count({ where }),
	]);

	return {
		data: notifications,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getUnreadCount = async (userId: string) => {
	const count = await prisma.notification.count({
		where: { userId, isRead: false },
	});

	return { count };
};

const markAsRead = async (id: string, userId: string) => {
	const notification = await prisma.notification.findUnique({ where: { id } });

	if (!notification || notification.userId !== userId) {
		throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
	}

	return prisma.notification.update({
		where: { id },
		data: { isRead: true, readAt: new Date() },
	});
};

const markAllAsRead = async (userId: string) => {
	await prisma.notification.updateMany({
		where: { userId, isRead: false },
		data: { isRead: true, readAt: new Date() },
	});

	return { success: true };
};

const deleteNotification = async (id: string, userId: string) => {
	const notification = await prisma.notification.findUnique({ where: { id } });

	if (!notification || notification.userId !== userId) {
		throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
	}

	await prisma.notification.delete({ where: { id } });

	return { success: true };
};

export const notificationService = {
	createNotification,
	getMyNotifications,
	getUnreadCount,
	markAsRead,
	markAllAsRead,
	deleteNotification,
};

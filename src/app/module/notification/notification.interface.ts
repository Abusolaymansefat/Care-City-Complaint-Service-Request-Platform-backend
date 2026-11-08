import type { NotificationType } from "../../../generated/prisma/enums";

export interface ICreateNotificationPayload {
	userId: string;
	title: string;
	message: string;
	type?: NotificationType;
	link?: string | null;
}

export interface INotificationQuery {
	page?: number | string;
	limit?: number | string;
	isRead?: boolean | string;
	type?: NotificationType;
	sortBy?: "createdAt" | "isRead";
	sortOrder?: "asc" | "desc";
}

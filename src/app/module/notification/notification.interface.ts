import type { NotificationType } from "../../../generated/prisma/enums";

export interface ICreateNotificationPayload {
	userId: string;
	title: string;
	message: string;
	type?: NotificationType;
	link?: string | null;
}

export interface INotificationQuery {
	page?: number;
	limit?: number;
	isRead?: boolean;
	type?: NotificationType;
	sortBy?: "createdAt" | "isRead";
	sortOrder?: "asc" | "desc";
}

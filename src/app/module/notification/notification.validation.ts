import z from "zod";
import { NotificationType } from "../../../generated/prisma/enums";

const notificationIdParamSchema = z.object({
	id: z.string().uuid("Invalid UUID"),
});

const notificationQuerySchema = z.object({
	isRead: z
		.enum(["true", "false"])
		.transform((value) => value === "true")
		.optional(),
	type: z.enum(NotificationType).optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	sortBy: z.enum(["createdAt", "isRead"]).optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const NotificationValidation = {
	notificationIdParamSchema,
	notificationQuerySchema,
};

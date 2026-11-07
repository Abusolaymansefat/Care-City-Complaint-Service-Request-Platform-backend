import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { NotificationController } from "./notification.controller";
import { NotificationValidation } from "./notification.validation";

const router = Router();

router.get(
	"/get-my-notifications",
	auth(),
	validateRequest(NotificationValidation.notificationQuerySchema, "query"),
	NotificationController.getMyNotifications,
);

router.get("/get-unread-count", auth(), NotificationController.getUnreadCount);

router.patch("/mark-all-as-read", auth(), NotificationController.markAllAsRead);

router.patch(
	"/mark-as-read/:id",
	auth(),
	validateRequest(NotificationValidation.notificationIdParamSchema, "params"),
	NotificationController.markAsRead,
);

router.delete(
	"/delete-notification/:id",
	auth(),
	validateRequest(NotificationValidation.notificationIdParamSchema, "params"),
	NotificationController.deleteNotification,
);

export const NotificationRoutes = router;

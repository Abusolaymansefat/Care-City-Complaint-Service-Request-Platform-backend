import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { FeedbackController } from "./feedback.controller";
import { createFeedbackSchema, feedbackIdSchema } from "./feedback.validation";

const router = Router();

router.post(
	"/create-feedback",
	auth(Role.CITIZEN),
	validateRequest(createFeedbackSchema),
	FeedbackController.createFeedback,
);

router.get(
	"/get-feedback/:id",
	auth(Role.ADMIN),
	validateRequest(feedbackIdSchema, "params"),
	FeedbackController.getFeedback,
);

router.patch(
	"/hide-feedback/:id",
	auth(Role.ADMIN),
	validateRequest(feedbackIdSchema, "params"),
	FeedbackController.hideFeedback,
);

export const FeedbackRoutes = router;

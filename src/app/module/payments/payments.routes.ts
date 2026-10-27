import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { PaymentsController } from "./payments.controller";
import { PaymentsValidation } from "./payments.validation";

const router = Router();

router.post(
	"/initiate-payment",
	auth(Role.CITIZEN),
	validateRequest(PaymentsValidation.initiatePaymentSchema),
	PaymentsController.initiatePayment,
);

router.get(
	"/bkash-callback",
	validateRequest(PaymentsValidation.bkashCallbackQuerySchema, "query"),
	PaymentsController.handleBkashCallback,
);

router.get(
	"/get-my-payments",
	auth(Role.CITIZEN),
	validateRequest(PaymentsValidation.paymentQuerySchema, "query"),
	PaymentsController.getMyPayments,
);

router.get(
	"/get-payments",
	auth(Role.ADMIN),
	validateRequest(PaymentsValidation.paymentQuerySchema, "query"),
	PaymentsController.getPayments,
);

router.get(
	"/get-payment/:id",
	auth(Role.CITIZEN, Role.ADMIN),
	validateRequest(PaymentsValidation.paymentIdParamSchema, "params"),
	PaymentsController.getPaymentById,
);

export const PaymentsRoutes = router;

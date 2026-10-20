import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = Router();

router.post(
	"/register",
	validateRequest(AuthValidation.RegitrationZodSchema),
	AuthController.register,
);

router.post(
	"/verify-email",
	validateRequest(AuthValidation.verifyEmailZodSchema),
	AuthController.verifyEmail,
);

router.post(
	"/login",
	validateRequest(AuthValidation.loginUserZodSchema),
	AuthController.login,
);

router.post(
	"/forgot-password",
	validateRequest(AuthValidation.forgotPasswordZodSchema),
	AuthController.forgotPassword,
);

router.post(
	"/reset-password",
	validateRequest(AuthValidation.resetPasswordZodSchema),
	AuthController.resetPassword,
);

router.post("/google-login", AuthController.googleLogin);

router.post("/refresh-token", AuthController.refreshToken);
router.get(
	"/me",
	auth(Role.CITIZEN, Role.TECHNICIAN, Role.DEPARTMENT_OFFICER, Role.ADMIN),
);

export const AuthRoutes = router;

import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = Router();

router.get(
	"/get-users",
	auth(Role.ADMIN),
	validateRequest(UserValidation.userQuerySchema, "query"),
	UserController.getUsers,
);

router.patch(
	"/update-user/:id",
	auth(Role.ADMIN),
	validateRequest(UserValidation.userIdParamSchema, "params"),
	validateRequest(UserValidation.updateUserSchema),
	UserController.updateUser,
);

router.patch(
	"/upload-profile-image",
	auth(Role.ADMIN, Role.CITIZEN, Role.DEPARTMENT_OFFICER, Role.TECHNICIAN),
	upload.single("profileImage"),
	UserController.uploadProfileImage,
);

export const UserRoutes = router;

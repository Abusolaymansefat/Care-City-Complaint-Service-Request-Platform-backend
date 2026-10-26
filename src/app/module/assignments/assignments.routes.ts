import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AssignmentsController } from "./assignments.controller";
import {
	createAssignmentSchema,
	updateAssignmentStatusSchema,
} from "./assignments.validation";

const router = Router();
router.post(
	"/create-assignment",
	auth(Role.ADMIN, Role.DEPARTMENT_OFFICER),
	validateRequest(createAssignmentSchema),
	AssignmentsController.createAssignment,
);

router.get(
	"/get-assignments",
	auth(Role.ADMIN, Role.DEPARTMENT_OFFICER, Role.TECHNICIAN),
	AssignmentsController.getAssignments,
);

router.patch(
	"/update-assignment-status:id/status",
	auth(Role.ADMIN, Role.DEPARTMENT_OFFICER, Role.TECHNICIAN),
	validateRequest(updateAssignmentStatusSchema),
	AssignmentsController.updateAssignmentStatus,
);

export const AssignmentsRoutes = router;

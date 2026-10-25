import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ComplaintsController } from "./complaints.controller";
import { ComplaintsValidation } from "./complaints.validation";

const router = Router();

router.post(
	"/create-complaint",
	auth(Role.CITIZEN, Role.DEPARTMENT_OFFICER, Role.TECHNICIAN, Role.ADMIN),
	validateRequest(ComplaintsValidation.createComplaintSchema),
	ComplaintsController.createComplaint,
);

router.get(
	"/get-my-complaints",
	auth(Role.CITIZEN),
	validateRequest(ComplaintsValidation.complaintQuerySchema),
	ComplaintsController.getMyComplaints,
);

router.get(
	"/get-complaints",
	auth(Role.ADMIN, Role.TECHNICIAN, Role.DEPARTMENT_OFFICER),
	validateRequest(ComplaintsValidation.complaintQuerySchema),
	ComplaintsController.getComplaints,
);

router.get(
	"/get-complaint/:id",
	auth(Role.ADMIN, Role.TECHNICIAN, Role.DEPARTMENT_OFFICER),
	validateRequest(ComplaintsValidation.complaintIdParamSchema),
	ComplaintsController.getComplaintById,
);

router.patch(
	"/update-complaint/:id",
	auth(Role.CITIZEN),
	validateRequest(ComplaintsValidation.updateComplaintSchema),
	ComplaintsController.updateComplaint,
);

router.patch(
	"/update-complaint-status/:id",
	auth(Role.ADMIN, Role.TECHNICIAN, Role.DEPARTMENT_OFFICER),
	validateRequest(ComplaintsValidation.updateComplaintStatusSchema),
	ComplaintsController.updateComplaintStatus,
);

export const ComplaintsRoutes = router;

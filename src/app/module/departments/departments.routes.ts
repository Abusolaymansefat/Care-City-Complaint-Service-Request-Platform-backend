import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { DepartmentsController } from "./departments.controller";
import { DepartmentsValidation } from "./departments.validation";

const router = Router();

router.post(
	"/department",
	validateRequest(DepartmentsValidation.createDepartmentSchema),
	DepartmentsController.createDepartment,
);
router.get(
	"/",
	validateRequest(DepartmentsValidation.departmentQuerySchema, "query"),
	DepartmentsController.getDepartments,
);
router.get(
	"/:id",
	validateRequest(DepartmentsValidation.departmentIdParamSchema, "params"),
	DepartmentsController.getDepartmentById,
);

router.patch(
	"/:id",
	auth(Role.ADMIN),
	validateRequest(DepartmentsValidation.departmentIdParamSchema, "params"),
	validateRequest(DepartmentsValidation.updateDepartmentSchema),
	DepartmentsController.updateDepartment,
);
router.delete(
	"/:id",
	auth(Role.ADMIN),
	validateRequest(DepartmentsValidation.departmentIdParamSchema, "params"),
	DepartmentsController.deleteDepartment,
);

export const DepartmentsRoutes = router;

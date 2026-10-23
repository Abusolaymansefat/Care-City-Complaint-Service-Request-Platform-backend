import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { DepartmentsController } from "./departments.controller";
import { DepartmentsValidation } from "./departments.validation";

const router = Router();

// Public: list departments
router.get(
	"/",
	validateRequest(DepartmentsValidation.departmentQuerySchema, "query"),
	DepartmentsController.getDepartments,
);

// Public: get department by ID
router.get(
	"/:id",
	validateRequest(DepartmentsValidation.departmentIdParamSchema, "params"),
	DepartmentsController.getDepartmentById,
);

// Admin only: create department
router.post(
	"/",
	auth(Role.ADMIN),
	validateRequest(DepartmentsValidation.createDepartmentSchema),
	DepartmentsController.createDepartment,
);

// Admin only: update department
router.patch(
	"/:id",
	auth(Role.ADMIN),
	validateRequest(DepartmentsValidation.departmentIdParamSchema, "params"),
	validateRequest(DepartmentsValidation.updateDepartmentSchema),
	DepartmentsController.updateDepartment,
);

// Admin only: delete department
router.delete(
	"/:id",
	auth(Role.ADMIN),
	validateRequest(DepartmentsValidation.departmentIdParamSchema, "params"),
	DepartmentsController.deleteDepartment,
);

export const DepartmentsRoutes = router;

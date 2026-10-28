import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { DepartmentsController } from "./departments.controller";
import { DepartmentsValidation } from "./departments.validation";

const router = Router();

// Admin only: create department
router.post(
	"/create-department",
	auth(Role.ADMIN, Role.CITIZEN),
	validateRequest(DepartmentsValidation.createDepartmentSchema),
	DepartmentsController.createDepartment,
);

// Public: list departments
router.get(
	"/get-departments",
	validateRequest(DepartmentsValidation.departmentQuerySchema, "query"),
	DepartmentsController.getDepartments,
);

// Public: get department by ID
router.get(
	"/get-departmentBy-by/:id",
	validateRequest(DepartmentsValidation.departmentIdParamSchema, "params"),
	DepartmentsController.getDepartmentById,
);

// Admin only: update department
router.patch(
	"/update-department/:id",
	auth(Role.ADMIN, Role.CITIZEN),
	validateRequest(DepartmentsValidation.departmentIdParamSchema, "params"),
	validateRequest(DepartmentsValidation.updateDepartmentSchema),
	DepartmentsController.updateDepartment,
);

// Admin only: delete department
router.delete(
	"/delete-department/:id",
	auth(Role.ADMIN, Role.CITIZEN),
	validateRequest(DepartmentsValidation.departmentIdParamSchema, "params"),
	DepartmentsController.deleteDepartment,
);

export const DepartmentsRoutes = router;

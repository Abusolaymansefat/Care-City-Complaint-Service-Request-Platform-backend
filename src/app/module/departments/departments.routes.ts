import { Router } from "express";
import { DepartmentsController } from "./departments.controller";

const router = Router();

router.post("/departments", DepartmentsController.createDepartment);

export const DepartmentsRoutes = router;

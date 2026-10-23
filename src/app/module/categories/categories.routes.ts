import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CategoriesController } from "./categories.controller";
import { CategoriesValidation } from "./categories.validation";

const router = Router();

router.get(
	"/",
	validateRequest(CategoriesValidation.categoryQuerySchema, "query"),
	CategoriesController.getCategories,
);

router.get(
	"/:id",
	validateRequest(CategoriesValidation.categoryIdParamSchema, "params"),
	CategoriesController.getCategoryById,
);

router.post(
	"/",
	auth(Role.ADMIN),
	validateRequest(CategoriesValidation.createCategorySchema),
	CategoriesController.createCategory,
);

router.patch(
	"/:id",
	auth(Role.ADMIN),
	validateRequest(CategoriesValidation.categoryIdParamSchema, "params"),
	validateRequest(CategoriesValidation.updateCategorySchema),
	CategoriesController.updateCategory,
);

router.delete(
	"/:id",
	auth(Role.ADMIN),
	validateRequest(CategoriesValidation.categoryIdParamSchema, "params"),
	CategoriesController.deleteCategory,
);

export const CategoriesRoutes = router;

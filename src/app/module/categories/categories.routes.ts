import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CategoriesController } from "./categories.controller";
import { CategoriesValidation } from "./categories.validation";

const router = Router();

router.post(
	"/create-category",
	auth(Role.ADMIN, Role.CITIZEN),
	validateRequest(CategoriesValidation.createCategorySchema),
	CategoriesController.createCategory,
);

router.get(
	"/get-categories",
	auth(Role.ADMIN),
	validateRequest(CategoriesValidation.categoryQuerySchema, "query"),
	CategoriesController.getCategories,
);
router.get(
	"/get-category/:id",
	validateRequest(CategoriesValidation.categoryIdParamSchema, "params"),
	CategoriesController.getCategoryById,
);

router.patch(
	"/update-category/:id",
	auth(Role.ADMIN),
	validateRequest(CategoriesValidation.categoryIdParamSchema, "params"),
	validateRequest(CategoriesValidation.updateCategorySchema),
	CategoriesController.updateCategory,
);

router.delete(
	"/delete-category/:id",
	auth(Role.ADMIN),
	validateRequest(CategoriesValidation.categoryIdParamSchema, "params"),
	CategoriesController.deleteCategory,
);

export const CategoriesRoutes = router;

import z from "zod";

const createCategorySchema = z.object({
	name: z.string().trim().min(2).max(100),
	description: z.string().trim().max(500).optional(),
});

const updateCategorySchema = z
	.object({
		name: z.string().trim().min(2).max(100).optional(),
		description: z.string().trim().max(500).optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});

const categoryIdParamSchema = z.object({
	id: z.string().min(1, "Category ID is required"),
});

const categoryQuerySchema = z.object({
	searchTerm: z.string().trim().optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const CategoriesValidation = {
	createCategorySchema,
	updateCategorySchema,
	categoryIdParamSchema,
	categoryQuerySchema,
};

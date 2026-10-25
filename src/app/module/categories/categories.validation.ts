import z from "zod";

const uuidSchema = z.string().uuid("Invalid UUID");

const createCategorySchema = z.object({
	name: z
		.string({ error: "Category name is required" })
		.trim()
		.min(2, "Category name must be at least 2 characters")
		.max(100, "Category name cannot exceed 100 characters"),
	description: z.string().trim().max(500).optional(),
	slaHours: z.number().int().min(1).max(8760).optional(),
	departmentId: z
		.string({ error: "Department ID is required" })
		.uuid("Department ID must be a valid UUID"),
});

const updateCategorySchema = z
	.object({
		name: z.string().trim().min(2).max(100).optional(),
		description: z.string().trim().max(500).nullable().optional(),
		slaHours: z.number().int().min(1).max(8760).optional(),
		departmentId: uuidSchema.optional(),
		isActive: z.boolean().optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});

const categoryIdParamSchema = z.object({
	id: uuidSchema,
});

const categoryQuerySchema = z.object({
	searchTerm: z.string().trim().optional(),
	departmentId: uuidSchema.optional(),
	isActive: z
		.enum(["true", "false"])
		.transform((value) => value === "true")
		.optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	sortBy: z.enum(["name", "slaHours", "isActive", "createdAt"]).optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const CategoriesValidation = {
	createCategorySchema,
	updateCategorySchema,
	categoryIdParamSchema,
	categoryQuerySchema,
};

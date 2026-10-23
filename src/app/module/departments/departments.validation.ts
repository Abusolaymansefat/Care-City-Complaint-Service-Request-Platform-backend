import z from "zod";

const createDepartmentSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, {
			message: "Department name must be at least 2 characters",
		})
		.max(100, {
			message: "Department name cannot exceed 100 characters",
		}),

	description: z
		.string()
		.trim()
		.max(500, {
			message: "Description cannot exceed 500 characters",
		})
		.optional(),
});

const updateDepartmentSchema = z
	.object({
		name: z.string().trim().min(2).max(100).optional(),
		description: z.string().trim().max(500).optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});

const departmentIdParamSchema = z.object({
	id: z.string().min(1, {
		message: "Department ID is required",
	}),
});

const departmentQuerySchema = z.object({
	searchTerm: z.string().trim().optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const DepartmentsValidation = {
	createDepartmentSchema,
	updateDepartmentSchema,
	departmentIdParamSchema,
	departmentQuerySchema,
};

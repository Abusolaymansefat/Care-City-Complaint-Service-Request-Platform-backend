import z from "zod";

const userIdParamSchema = z.object({
	id: z.string().uuid(),
});

const userQuerySchema = z.object({
	searchTerm: z.string().trim().max(100).optional(),
	role: z
		.enum(["CITIZEN", "TECHNICIAN", "DEPARTMENT_OFFICER", "ADMIN"])
		.optional(),
	status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "BANNED"]).optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});

const updateUserSchema = z
	.object({
		role: z
			.enum(["CITIZEN", "TECHNICIAN", "DEPARTMENT_OFFICER", "ADMIN"])
			.optional(),
		status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "BANNED"]).optional(),
		departmentId: z.string().uuid().nullable().optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});

export const UserValidation = {
	userIdParamSchema,
	userQuerySchema,
	updateUserSchema,
};

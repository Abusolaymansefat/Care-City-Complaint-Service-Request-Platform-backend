import z from "zod";
import { ComplaintStatus, Priority } from "../../../generated/prisma/enums";

const uuidSchema = z.string().uuid("Invalid UUID");

const createComplaintSchema = z.object({
	title: z.string().trim().min(5).max(150),
	description: z.string().trim().min(10).max(3000),
	address: z.string().trim().min(5).max(300),
	latitude: z.number().min(-90).max(90).optional(),
	longitude: z.number().min(-180).max(180).optional(),
	categoryId: uuidSchema,
});

const updateComplaintSchema = z
	.object({
		title: z.string().trim().min(5).max(150).optional(),
		description: z.string().trim().min(10).max(3000).optional(),
		address: z.string().trim().min(5).max(300).optional(),
		latitude: z.number().min(-90).max(90).nullable().optional(),
		longitude: z.number().min(-180).max(180).nullable().optional(),
		categoryId: uuidSchema.optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});

const updateComplaintStatusSchema = z.object({
	status: z.enum(ComplaintStatus).optional(),
	comment: z.string().trim().max(1000).optional(),
});

const complaintIdParamSchema = z.object({
	id: uuidSchema,
});

const complaintQuerySchema = z.object({
	searchTerm: z.string().trim().optional(),
	categoryId: uuidSchema.optional(),
	departmentId: uuidSchema.optional(),
	status: z.enum(ComplaintStatus).optional(),
	priority: z.enum(Priority).optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	sortBy: z
		.enum([
			"title",
			"trackingCode",
			"status",
			"priority",
			"createdAt",
			"updatedAt",
		])
		.optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const ComplaintsValidation = {
	createComplaintSchema,
	updateComplaintSchema,
	updateComplaintStatusSchema,
	complaintIdParamSchema,
	complaintQuerySchema,
};

import z from "zod";

const createComplaintSchema = z.object({
	title: z.string().trim().min(5).max(150),
	description: z.string().trim().min(10).max(3000),
	categoryId: z.string().min(1, "Category ID is required"),
	address: z.string().trim().min(5).max(300),
	latitude: z.number().min(-90).max(90).optional(),
	longitude: z.number().min(-180).max(180).optional(),
});

const updateComplaintSchema = z
	.object({
		title: z.string().trim().min(5).max(150).optional(),
		description: z.string().trim().min(10).max(3000).optional(),
		categoryId: z.string().min(1).optional(),
		address: z.string().trim().min(5).max(300).optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});

const updateComplaintStatusSchema = z.object({
	status: z.string().min(1),
	resolutionNote: z.string().trim().max(1000).optional(),
});

const complaintIdParamSchema = z.object({
	id: z.string().min(1, "Complaint ID is required"),
});

const complaintQuerySchema = z.object({
	searchTerm: z.string().trim().optional(),
	categoryId: z.string().optional(),
	status: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const ComplaintsValidation = {
	createComplaintSchema,
	updateComplaintSchema,
	updateComplaintStatusSchema,
	complaintIdParamSchema,
	complaintQuerySchema,
};

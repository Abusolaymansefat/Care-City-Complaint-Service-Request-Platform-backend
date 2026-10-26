import { z } from "zod";

export const createAssignmentSchema = z.object({
	body: z.object({
		complaintId: z.string().uuid(),
		technicianId: z.string().uuid(),
		notes: z.string().max(1000).optional(),
	}),
});

export const updateAssignmentStatusSchema = z.object({
	body: z.object({
		status: z.enum(["IN_PROGRESS", "COMPLETED", "REJECTED"]),
		notes: z.string().max(1000).optional(),
	}),
});

export const assignmentIdSchema = z.object({
	params: z.object({
		id: z.string().uuid(),
	}),
});

export const assignmentQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});

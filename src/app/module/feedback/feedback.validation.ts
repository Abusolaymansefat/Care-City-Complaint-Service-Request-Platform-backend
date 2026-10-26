import { z } from "zod";

export const createFeedbackSchema = z.object({
	body: z.object({
		complaintId: z.string().uuid(),
		rating: z.number().int().min(1).max(5),
		comment: z.string().trim().max(2000).optional(),
	}),
});

export const feedbackIdSchema = z.object({
	params: z.object({
		id: z.string().uuid(),
	}),
});

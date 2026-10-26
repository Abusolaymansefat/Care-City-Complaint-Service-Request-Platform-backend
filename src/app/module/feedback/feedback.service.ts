import httpStatus from "http-status";
import {
	ComplaintStatus,
	FeedbackStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import type { ICreateFeedbackPayload } from "./feedback.interface";

const createFeedback = async (
	citizenId: string,
	payload: ICreateFeedbackPayload,
) => {
	const complaint = await prisma.complaint.findUnique({
		where: { id: payload.complaintId },
		select: {
			id: true,
			status: true,
			citizenId: true,
		},
	});

	if (!complaint) {
		throw new AppError(httpStatus.NOT_FOUND, "Complaint not found");
	}

	if (complaint.citizenId !== citizenId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to submit feedback for this complaint",
		);
	}

	if (
		complaint.status !== ComplaintStatus.RESOLVED &&
		complaint.status !== ComplaintStatus.CLOSED
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Feedback can only be submitted for resolved or closed complaints",
		);
	}

	const existingFeedback = await prisma.feedback.findUnique({
		where: { complaintId: complaint.id },
		select: { id: true },
	});

	if (existingFeedback) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Feedback has already been submitted for this complaint",
		);
	}

	return prisma.feedback.create({
		data: {
			complaintId: complaint.id,
			citizenId,
			rating: payload.rating,
			comment: payload.comment?.trim() || null,
		},
		include: {
			complaint: {
				select: {
					id: true,
					trackingCode: true,
					title: true,
					status: true,
				},
			},
		},
	});
};

const getFeedback = async (id: string) => {
	const feedback = await prisma.feedback.findUnique({
		where: { id },
		include: {
			complaint: {
				select: {
					id: true,
					trackingCode: true,
					title: true,
					status: true,
				},
			},
		},
	});

	if (!feedback) {
		throw new AppError(httpStatus.NOT_FOUND, "Feedback not found");
	}

	return feedback;
};

const hideFeedback = async (id: string) => {
	const feedback = await prisma.feedback.findUnique({
		where: { id },
	});

	if (!feedback) {
		throw new AppError(httpStatus.NOT_FOUND, "Feedback not found");
	}

	return prisma.feedback.update({
		where: { id },
		data: { status: FeedbackStatus.HIDDEN },
	});
};

export const feedbackService = {
	createFeedback,
	getFeedback,
	hideFeedback,
};
